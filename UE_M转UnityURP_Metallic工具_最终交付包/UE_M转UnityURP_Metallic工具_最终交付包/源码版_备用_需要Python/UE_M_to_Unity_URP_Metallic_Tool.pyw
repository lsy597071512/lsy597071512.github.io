from __future__ import annotations

import os
import subprocess
import sys
import threading
import traceback
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

def ensure_pillow_installed() -> None:
    try:
        import PIL  # noqa: F401
        return
    except Exception:
        pass

    root = tk.Tk()
    root.withdraw()
    messagebox.showinfo(
        "首次启动环境检查",
        "检测到当前电脑缺少 Pillow 图像库。\n\n"
        "工具将自动安装 Pillow，安装过程可能需要 1-3 分钟。\n"
        "如果电脑无法联网，请让同事连接网络后再启动。",
    )

    commands = [
        [sys.executable, "-m", "ensurepip", "--upgrade"],
        [sys.executable, "-m", "pip", "install", "--user", "--upgrade", "pillow"],
    ]
    last_output = ""
    for command in commands:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=300,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform.startswith("win") else 0,
        )
        last_output = (result.stdout or "") + "\n" + (result.stderr or "")
        if result.returncode != 0 and "ensurepip" not in command:
            messagebox.showerror(
                "Pillow 安装失败",
                "自动安装 Pillow 失败。\n\n"
                "请在命令行手动运行：\n"
                "python -m pip install --user --upgrade pillow\n\n"
                f"错误信息：\n{last_output[-1800:]}",
            )
            raise RuntimeError(last_output)

    try:
        import importlib

        importlib.invalidate_caches()
        import PIL  # noqa: F401
    except Exception as exc:
        messagebox.showerror(
            "Pillow 检查失败",
            "Pillow 已尝试安装，但当前 Python 仍无法导入。\n\n"
            "请关闭工具后重新打开，或手动运行：\n"
            "python -m pip install --user --upgrade pillow\n\n"
            f"错误信息：{exc}",
        )
        raise


ensure_pillow_installed()
from PIL import Image


APP_VERSION = "1.1.1"
APP_TITLE = f"UE M贴图 -> Unity URP Metallic Alpha 批量转换工具 v{APP_VERSION}"
SUPPORTED_EXTENSIONS = {".png", ".tga"}
CHANNEL_OPTIONS = ["R", "G", "B", "A", "0", "1"]

PRESETS = {
    "UE ORM 常用：R=AO, G=Roughness, B=Metallic": {
        "metallic": "B",
        "roughness": "G",
        "ao": "R",
    },
    "UE MRA：R=Metallic, G=Roughness, B=AO": {
        "metallic": "R",
        "roughness": "G",
        "ao": "B",
    },
    "UE RMA：R=Roughness, G=Metallic, B=AO": {
        "metallic": "G",
        "roughness": "R",
        "ao": "B",
    },
    "自定义": {},
}

FILL_MODES = [
    "RGB=Metallic 预览友好",
    "严格URP：R=Metallic, G/B=0",
    "自定义保留：R=Metallic, G=AO, B=0",
]

OUTPUT_FORMATS = ["跟随源文件", "PNG", "TGA"]


def desktop_path() -> Path:
    return Path.home() / "Desktop"


def read_channel(image: Image.Image, source: str) -> Image.Image:
    rgba = image.convert("RGBA")
    if source in ("R", "G", "B", "A"):
        return rgba.getchannel(source)
    if source == "0":
        return Image.new("L", rgba.size, 0)
    if source == "1":
        return Image.new("L", rgba.size, 255)
    raise ValueError(f"未知通道：{source}")


def make_unity_metallic_map(
    source_path: Path,
    metallic_channel: str,
    roughness_channel: str,
    ao_channel: str,
    invert_roughness: bool,
    fill_mode: str,
) -> Image.Image:
    with Image.open(source_path) as image:
        rgba = image.convert("RGBA")
        metallic = read_channel(rgba, metallic_channel)
        roughness = read_channel(rgba, roughness_channel)
        smoothness = roughness.point(lambda value: 255 - value) if invert_roughness else roughness
        black = Image.new("L", rgba.size, 0)

        if fill_mode == "严格URP：R=Metallic, G/B=0":
            return Image.merge("RGBA", (metallic, black, black, smoothness))
        if fill_mode == "自定义保留：R=Metallic, G=AO, B=0":
            ao = read_channel(rgba, ao_channel)
            return Image.merge("RGBA", (metallic, ao, black, smoothness))
        return Image.merge("RGBA", (metallic, metallic, metallic, smoothness))


def safe_output_path(path: Path, overwrite: bool) -> Path:
    if overwrite or not path.exists():
        return path

    stem = path.stem
    suffix = path.suffix
    parent = path.parent
    index = 1
    while True:
        candidate = parent / f"{stem}_{index:03d}{suffix}"
        if not candidate.exists():
            return candidate
        index += 1


def build_output_name(
    input_path: Path,
    output_format: str,
    suffix_text: str,
    replace_trailing_m: bool,
) -> str:
    stem = input_path.stem
    if replace_trailing_m and stem.lower().endswith("_m"):
        stem = stem[:-2]

    if output_format == "PNG":
        ext = ".png"
    elif output_format == "TGA":
        ext = ".tga"
    else:
        ext = input_path.suffix.lower()

    return f"{stem}{suffix_text}{ext}"


def is_relative_to(path: Path, parent: Path) -> bool:
    try:
        path.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def has_output_suffix(path: Path, suffix_text: str) -> bool:
    if not suffix_text:
        return False
    return path.stem.lower().endswith(suffix_text.lower())


class ConverterApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title(APP_TITLE)
        self.geometry("980x720")
        self.minsize(900, 650)

        self.selected_files: list[Path] = []
        self.input_mode = tk.StringVar(value="folder")
        self.input_folder = tk.StringVar(value="")
        self.output_folder = tk.StringVar(
            value=str(desktop_path() / "Unity_URP_Metallic_Output")
        )
        self.recursive = tk.BooleanVar(value=True)
        self.preset = tk.StringVar(value=list(PRESETS.keys())[0])
        self.metallic_channel = tk.StringVar(value="B")
        self.roughness_channel = tk.StringVar(value="G")
        self.ao_channel = tk.StringVar(value="R")
        self.invert_roughness = tk.BooleanVar(value=True)
        self.fill_mode = tk.StringVar(value=FILL_MODES[0])
        self.output_format = tk.StringVar(value=OUTPUT_FORMATS[0])
        self.suffix_text = tk.StringVar(value="_UnityMetallic")
        self.replace_trailing_m = tk.BooleanVar(value=True)
        self.overwrite = tk.BooleanVar(value=False)
        self.skip_existing_outputs = tk.BooleanVar(value=True)

        self._build_ui()
        self._apply_preset()

    def _build_ui(self) -> None:
        outer = ttk.Frame(self, padding=16)
        outer.pack(fill="both", expand=True)

        header = ttk.Label(
            outer,
            text="把 UE M 贴图转换为 Unity URP Lit 可用的 Metallic Map：R=Metallic，A=Smoothness",
            font=("Microsoft YaHei UI", 13, "bold"),
        )
        header.pack(anchor="w")

        note = ttk.Label(
            outer,
            text="提示：UE 的 Roughness 需要反向写入 Unity Smoothness。PNG/TGA 会以 RGBA 输出。",
            foreground="#555555",
        )
        note.pack(anchor="w", pady=(4, 12))

        input_frame = ttk.LabelFrame(outer, text="1. 输入与输出", padding=12)
        input_frame.pack(fill="x")
        input_frame.columnconfigure(1, weight=1)

        ttk.Radiobutton(
            input_frame,
            text="文件夹批处理",
            variable=self.input_mode,
            value="folder",
        ).grid(row=0, column=0, sticky="w")
        ttk.Entry(input_frame, textvariable=self.input_folder).grid(
            row=0, column=1, sticky="ew", padx=8
        )
        ttk.Button(input_frame, text="选择文件夹", command=self.choose_input_folder).grid(
            row=0, column=2, padx=(0, 8)
        )
        ttk.Checkbutton(input_frame, text="包含子文件夹", variable=self.recursive).grid(
            row=0, column=3, sticky="w"
        )

        ttk.Radiobutton(
            input_frame,
            text="选择多个文件",
            variable=self.input_mode,
            value="files",
        ).grid(row=1, column=0, sticky="w", pady=(8, 0))
        self.files_label = ttk.Label(input_frame, text="未选择文件", foreground="#666666")
        self.files_label.grid(row=1, column=1, sticky="w", padx=8, pady=(8, 0))
        ttk.Button(input_frame, text="选择 PNG/TGA", command=self.choose_files).grid(
            row=1, column=2, sticky="ew", padx=(0, 8), pady=(8, 0)
        )

        ttk.Label(input_frame, text="输出目录").grid(row=2, column=0, sticky="w", pady=(8, 0))
        ttk.Entry(input_frame, textvariable=self.output_folder).grid(
            row=2, column=1, sticky="ew", padx=8, pady=(8, 0)
        )
        ttk.Button(input_frame, text="选择输出", command=self.choose_output_folder).grid(
            row=2, column=2, sticky="ew", padx=(0, 8), pady=(8, 0)
        )
        ttk.Button(input_frame, text="打开输出", command=self.open_output_folder).grid(
            row=2, column=3, sticky="ew", pady=(8, 0)
        )

        channel_frame = ttk.LabelFrame(outer, text="2. 通道映射", padding=12)
        channel_frame.pack(fill="x", pady=(12, 0))
        channel_frame.columnconfigure(1, weight=1)

        ttk.Label(channel_frame, text="预设").grid(row=0, column=0, sticky="w")
        preset_box = ttk.Combobox(
            channel_frame,
            textvariable=self.preset,
            values=list(PRESETS.keys()),
            state="readonly",
        )
        preset_box.grid(row=0, column=1, sticky="ew", padx=8)
        preset_box.bind("<<ComboboxSelected>>", lambda _event: self._apply_preset())

        ttk.Label(channel_frame, text="Metallic 来源").grid(row=1, column=0, sticky="w", pady=(8, 0))
        ttk.Combobox(
            channel_frame,
            textvariable=self.metallic_channel,
            values=CHANNEL_OPTIONS,
            width=12,
            state="readonly",
        ).grid(row=1, column=1, sticky="w", padx=8, pady=(8, 0))

        ttk.Label(channel_frame, text="Roughness 来源").grid(row=1, column=2, sticky="w", pady=(8, 0))
        ttk.Combobox(
            channel_frame,
            textvariable=self.roughness_channel,
            values=CHANNEL_OPTIONS,
            width=12,
            state="readonly",
        ).grid(row=1, column=3, sticky="w", padx=8, pady=(8, 0))

        ttk.Label(channel_frame, text="AO 来源，可选").grid(row=1, column=4, sticky="w", pady=(8, 0))
        ttk.Combobox(
            channel_frame,
            textvariable=self.ao_channel,
            values=CHANNEL_OPTIONS,
            width=12,
            state="readonly",
        ).grid(row=1, column=5, sticky="w", padx=8, pady=(8, 0))

        ttk.Checkbutton(
            channel_frame,
            text="Roughness 反向写入 Alpha Smoothness",
            variable=self.invert_roughness,
        ).grid(row=2, column=0, columnspan=3, sticky="w", pady=(10, 0))

        output_frame = ttk.LabelFrame(outer, text="3. 输出设置", padding=12)
        output_frame.pack(fill="x", pady=(12, 0))

        ttk.Label(output_frame, text="RGB 填充方式").grid(row=0, column=0, sticky="w")
        ttk.Combobox(
            output_frame,
            textvariable=self.fill_mode,
            values=FILL_MODES,
            width=34,
            state="readonly",
        ).grid(row=0, column=1, sticky="w", padx=8)

        ttk.Label(output_frame, text="输出格式").grid(row=0, column=2, sticky="w", padx=(16, 0))
        ttk.Combobox(
            output_frame,
            textvariable=self.output_format,
            values=OUTPUT_FORMATS,
            width=14,
            state="readonly",
        ).grid(row=0, column=3, sticky="w", padx=8)

        ttk.Label(output_frame, text="输出后缀").grid(row=1, column=0, sticky="w", pady=(8, 0))
        ttk.Entry(output_frame, textvariable=self.suffix_text, width=22).grid(
            row=1, column=1, sticky="w", padx=8, pady=(8, 0)
        )

        ttk.Checkbutton(
            output_frame,
            text="如果源文件以 _M 结尾，输出时先去掉 _M",
            variable=self.replace_trailing_m,
        ).grid(row=1, column=2, columnspan=2, sticky="w", padx=(16, 0), pady=(8, 0))

        ttk.Checkbutton(
            output_frame,
            text="覆盖已存在文件",
            variable=self.overwrite,
        ).grid(row=2, column=0, sticky="w", pady=(8, 0))
        ttk.Checkbutton(
            output_frame,
            text="跳过已经带输出后缀的贴图",
            variable=self.skip_existing_outputs,
        ).grid(row=2, column=1, columnspan=3, sticky="w", padx=8, pady=(8, 0))

        action_frame = ttk.Frame(outer)
        action_frame.pack(fill="x", pady=(14, 0))
        self.convert_button = ttk.Button(
            action_frame,
            text="开始批量转换",
            command=self.start_convert,
        )
        self.convert_button.pack(side="left")
        ttk.Button(action_frame, text="清空日志", command=self.clear_log).pack(side="left", padx=8)

        self.progress = ttk.Progressbar(action_frame, mode="determinate")
        self.progress.pack(side="left", fill="x", expand=True, padx=(10, 0))

        log_frame = ttk.LabelFrame(outer, text="日志", padding=8)
        log_frame.pack(fill="both", expand=True, pady=(12, 0))
        self.log_text = tk.Text(log_frame, height=16, wrap="word")
        self.log_text.pack(side="left", fill="both", expand=True)
        scrollbar = ttk.Scrollbar(log_frame, command=self.log_text.yview)
        scrollbar.pack(side="right", fill="y")
        self.log_text.configure(yscrollcommand=scrollbar.set)

    def _apply_preset(self) -> None:
        values = PRESETS.get(self.preset.get(), {})
        if not values:
            return
        self.metallic_channel.set(values["metallic"])
        self.roughness_channel.set(values["roughness"])
        self.ao_channel.set(values["ao"])

    def choose_input_folder(self) -> None:
        folder = filedialog.askdirectory(title="选择包含 UE M 贴图的文件夹")
        if folder:
            self.input_mode.set("folder")
            self.input_folder.set(folder)

    def choose_files(self) -> None:
        files = filedialog.askopenfilenames(
            title="选择 PNG/TGA M 贴图",
            filetypes=[
                ("PNG/TGA", "*.png *.tga"),
                ("PNG", "*.png"),
                ("TGA", "*.tga"),
                ("所有文件", "*.*"),
            ],
        )
        if files:
            self.input_mode.set("files")
            self.selected_files = [Path(file) for file in files]
            self.files_label.configure(text=f"已选择 {len(self.selected_files)} 个文件")

    def choose_output_folder(self) -> None:
        folder = filedialog.askdirectory(title="选择输出文件夹")
        if folder:
            self.output_folder.set(folder)

    def open_output_folder(self) -> None:
        folder = Path(self.output_folder.get())
        folder.mkdir(parents=True, exist_ok=True)
        os.startfile(folder)

    def clear_log(self) -> None:
        self.log_text.delete("1.0", "end")

    def log(self, message: str) -> None:
        self.log_text.insert("end", message + "\n")
        self.log_text.see("end")
        self.update_idletasks()

    def collect_input_files(self) -> list[Path]:
        suffix_text = self.suffix_text.get()

        if self.input_mode.get() == "files":
            files = self.selected_files
        else:
            folder = Path(self.input_folder.get())
            if not folder.exists():
                raise FileNotFoundError("输入文件夹不存在")
            iterator = folder.rglob("*") if self.recursive.get() else folder.glob("*")
            files = [path for path in iterator if path.is_file()]

        result: list[Path] = []
        for path in files:
            if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
                continue
            if self.skip_existing_outputs.get() and has_output_suffix(path, suffix_text):
                continue
            result.append(path)
        return sorted(result, key=lambda item: str(item).lower())

    def start_convert(self) -> None:
        self.convert_button.configure(state="disabled")
        self.progress.configure(value=0)
        thread = threading.Thread(target=self._convert_worker, daemon=True)
        thread.start()

    def _convert_worker(self) -> None:
        try:
            self.convert_all()
        except Exception as exc:
            self.log("转换失败：")
            self.log(str(exc))
            self.log(traceback.format_exc())
            messagebox.showerror("转换失败", str(exc))
        finally:
            self.convert_button.configure(state="normal")

    def convert_all(self) -> None:
        files = self.collect_input_files()
        output_dir = Path(self.output_folder.get())
        output_dir.mkdir(parents=True, exist_ok=True)

        if not files:
            self.log("没有找到可转换的 PNG/TGA 文件。")
            self.log("如果输入目录和输出目录相同，工具现在会允许原始 PNG/TGA 参与转换，并只跳过已带输出后缀的结果图。")
            messagebox.showinfo(
                "没有文件",
                "没有找到可转换的 PNG/TGA 文件。\n\n"
                "请检查：\n"
                "1. 文件扩展名是否为 .png 或 .tga\n"
                "2. 文件名是否已经带有输出后缀\n"
                "3. 是否勾选了“包含子文件夹”",
            )
            return

        self.log(f"找到 {len(files)} 个文件，开始转换。")
        self.log(
            "输出规则：R=Metallic，A=Smoothness；"
            + ("Roughness 会反向。" if self.invert_roughness.get() else "Roughness 不反向。")
        )
        self.progress.configure(maximum=len(files), value=0)

        success = 0
        failed = 0
        for index, path in enumerate(files, start=1):
            try:
                output_name = build_output_name(
                    path,
                    self.output_format.get(),
                    self.suffix_text.get(),
                    self.replace_trailing_m.get(),
                )
                output_path = safe_output_path(output_dir / output_name, self.overwrite.get())
                result = make_unity_metallic_map(
                    path,
                    self.metallic_channel.get(),
                    self.roughness_channel.get(),
                    self.ao_channel.get(),
                    self.invert_roughness.get(),
                    self.fill_mode.get(),
                )

                if output_path.suffix.lower() == ".png":
                    result.save(output_path, optimize=True)
                else:
                    result.save(output_path)

                success += 1
                self.log(f"[OK] {path.name} -> {output_path.name}")
            except Exception as exc:
                failed += 1
                self.log(f"[失败] {path}：{exc}")

            self.progress.configure(value=index)
            self.update_idletasks()

        self.log(f"完成：成功 {success}，失败 {failed}。")
        messagebox.showinfo("转换完成", f"转换完成。\n\n成功：{success}\n失败：{failed}\n\n输出目录：{output_dir}")


def main() -> None:
    if sys.platform.startswith("win"):
        try:
            from ctypes import windll

            windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            pass

    app = ConverterApp()
    app.mainloop()


if __name__ == "__main__":
    main()

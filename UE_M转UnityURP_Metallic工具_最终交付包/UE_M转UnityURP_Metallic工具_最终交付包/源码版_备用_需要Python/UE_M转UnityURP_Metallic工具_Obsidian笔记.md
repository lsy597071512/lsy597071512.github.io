---
title: UE M 贴图转 Unity URP Metallic 工具
aliases:
  - UE M 转 Unity Metallic
  - UE ORM 转 Unity URP Metallic Alpha
  - Unity URP Metallic Map 批量转换工具
tags:
  - TA工具
  - Unity
  - URP
  - PBR
  - 材质管线
  - 贴图工具
  - 批处理
type: tool
status: packaged
tool_name: UE_M_to_Unity_URP_Metallic_Tool
version: 1.1.1
created: 2026-07-08
updated: 2026-07-08
owner: LiSuYan
engine: Unity URP
shader: URP Lit
input_formats:
  - PNG
  - TGA
output_formats:
  - PNG
  - TGA
package_name: UE_M转UnityURP_Metallic工具_最终交付包.zip
recommended_entry: UE_M_to_Unity_URP_Metallic_Tool.exe
fallback_entry: 源码版_备用_需要Python/启动工具.bat
---

# UE M 贴图转 Unity URP Metallic 工具

## 用途

这个工具用于把 UE 引擎资产里的 M/Mask/ORM 混合贴图，批量转换成 Unity URP Lit 材质可用的 Metallic Map。

Unity URP Lit 的 Metallic Workflow 常用读取方式：

```text
R = Metallic
A = Smoothness
```

UE 中常见的是 Roughness，而 Unity URP Lit 需要 Smoothness，所以转换时默认执行：

```text
Smoothness = 1 - Roughness
```

## 适用场景

- UE 资产迁移到 Unity URP。
- 批量处理 Quixel、商城资产或外包资产的 M/ORM 贴图。
- UE M 图的 R/G/B 通道含义不统一，需要人工选择通道后批量转换。
- 希望生成带 Alpha 的 Unity Metallic Map，而不是手动在 Photoshop 里逐张通道复制。

## 交付内容

最终交付包：

```text
UE_M转UnityURP_Metallic工具_最终交付包.zip
```

解压后主要文件：

```text
UE_M_to_Unity_URP_Metallic_Tool.exe
使用说明.md
发给同事说明.md
UE_M转UnityURP_Metallic工具_Obsidian笔记.md
源码版_备用_需要Python/
```

推荐入口：

```text
UE_M_to_Unity_URP_Metallic_Tool.exe
```

备用入口：

```text
源码版_备用_需要Python/启动工具.bat
```

## 为什么有 exe 和源码版

`exe` 版本已经内置运行环境和 Pillow 图像库，同事电脑通常不需要安装 Python，也不需要手动安装依赖。

源码版用于以下情况：

- 公司安全软件拦截 exe。
- 需要查看或修改源码。
- 想在已有 Python 环境中运行。

源码版启动脚本会自动检查：

- Python
- pip
- Pillow

如果缺少 Pillow，会自动运行：

```powershell
python -m pip install --user --upgrade pillow
```

## 通道规则

工具输出规则：

| 输出通道 | 内容 |
|---|---|
| R | Metallic |
| G | 根据输出模式，可为 Metallic/AO/0 |
| B | 根据输出模式，可为 Metallic/0 |
| A | Smoothness |

默认推荐输出：

```text
RGB = Metallic
A = Smoothness
```

这样做的好处是，在资源管理器或看图软件里能直接看到金属度黑白预览，同时 Unity URP Lit 仍然读取 R 和 A。

## 常见 UE M 图预设

### UE ORM 常用

常见通道：

```text
R = AO
G = Roughness
B = Metallic
```

工具中选择：

```text
UE ORM 常用：R=AO, G=Roughness, B=Metallic
```

输出：

```text
R = B 通道 Metallic
A = 1 - G 通道 Roughness
```

### UE MRA

有些项目会使用：

```text
R = Metallic
G = Roughness
B = AO
```

工具中选择：

```text
UE MRA：R=Metallic, G=Roughness, B=AO
```

### UE RMA

有些项目会使用：

```text
R = Roughness
G = Metallic
B = AO
```

工具中选择：

```text
UE RMA：R=Roughness, G=Metallic, B=AO
```

### 自定义

如果不确定贴图通道来源，需要先在 Photoshop、Substance、Krita 或通道查看工具里检查 R/G/B/A。

工具支持：

```text
Metallic 来源：R/G/B/A/0/1
Roughness 来源：R/G/B/A/0/1
AO 来源：R/G/B/A/0/1
```

`0` 表示全黑，`1` 表示全白。

## 使用步骤

1. 解压最终交付包。
2. 双击 `UE_M_to_Unity_URP_Metallic_Tool.exe`。
3. 选择输入方式：
   - 文件夹批处理
   - 多文件选择
4. 选择输出目录。
5. 选择通道预设。
6. 确认 `Roughness 反向写入 Alpha Smoothness` 已勾选。
7. 选择输出格式：
   - 跟随源文件
   - PNG
   - TGA
8. 点击 `开始批量转换`。

## 输入目录和输出目录相同

1.1.1 版本已经支持输入目录与输出目录相同。

当输入目录和输出目录一致时，工具会：

- 正常读取当前目录里的原始 PNG/TGA。
- 自动跳过已经带输出后缀的结果图，例如 `_UnityMetallic`。
- 将转换后的贴图输出到同一个目录。

推荐保持默认勾选：

```text
跳过已经带输出后缀的贴图
```

这样第二次批处理同一目录时，不会把已经转换过的 Unity Metallic 图再次作为源图处理。

## 输出命名

默认输出后缀：

```text
_UnityMetallic
```

如果输入：

```text
T_Rock_01_M.png
```

默认输出：

```text
T_Rock_01_UnityMetallic.png
```

如果不想去掉 `_M`，可以取消勾选：

```text
如果源文件以 _M 结尾，输出时先去掉 _M
```

## Unity URP 导入设置

导入 Unity 后，建议设置：

| 项目 | 建议 |
|---|---|
| Texture Type | Default |
| sRGB | 关闭 |
| Alpha Source | Input Texture Alpha |
| Compression | 根据项目平台设置 |
| Wrap Mode | Repeat 或按资产需求 |
| Filter Mode | Bilinear/Trilinear |

材质设置：

| URP Lit 参数 | 设置 |
|---|---|
| Workflow Mode | Metallic |
| Metallic Map | 使用转换后的贴图 |
| Smoothness Source | Metallic Alpha |

## QA 检查清单

转换后至少检查：

- [ ] 输出文件有 Alpha。
- [ ] R 通道是金属度。
- [ ] A 通道是 Smoothness，不是 Roughness。
- [ ] Unity 中关闭了 sRGB。
- [ ] Unity 材质 Smoothness Source 使用 Metallic Alpha。
- [ ] 金属资产没有变成全黑或全白。
- [ ] 非金属资产 Metallic 接近 0。
- [ ] 粗糙表面在 Unity 中没有错误变得特别亮。
- [ ] PNG/TGA 都能正常打开。

## 常见问题

### 同事打开源码版提示缺少 PIL

原因是同事电脑缺少 Pillow。

解决：

- 推荐直接使用 exe 版本。
- 如果必须使用源码版，双击 `启动工具.bat`，不要直接双击 `.pyw`。

### 转完后 Unity 里反光不对

优先检查：

1. Roughness 通道是否选对。
2. 是否勾选 Roughness 反向。
3. Unity 中是否关闭 sRGB。
4. Smoothness Source 是否选择 Metallic Alpha。

### 不知道 UE M 图哪个通道是什么

先按常见 ORM 试：

```text
R = AO
G = Roughness
B = Metallic
```

如果效果不对，再逐通道检查。很多外包或商城资产并不完全统一。

## 技术说明

工具实现：

- Python
- Tkinter UI
- Pillow 图像处理
- PyInstaller 打包 exe

已验证：

- PNG 输入输出。
- TGA 输入输出。
- ORM 通道转换。
- `Smoothness = 255 - Roughness`。
- exe 可启动。

## 版本记录

### 1.1.1

- 修复输入目录与输出目录相同时，源 PNG/TGA 被误跳过的问题。
- 现在同目录转换时只跳过已带输出后缀的结果图。
- 优化没有找到文件时的提示信息。

### 1.1.0

- 增加 exe 打包版。
- 增加源码版启动前环境检查。
- 启动脚本自动检查并安装 Pillow。
- 增加发给同事说明。
- 增加 Obsidian 笔记属性文档。

### 1.0.0

- 支持 PNG/TGA 批量转换。
- 支持 Metallic/Roughness/AO 通道选择。
- 支持 UE ORM/MRA/RMA 预设。
- 支持输出 PNG/TGA。

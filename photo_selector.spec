# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_submodules

block_cipher = None

a = Analysis(
    ['photo_selector/cli.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('photo_selector/models/mobilenet_v3_small.pth', 'models'),
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tensorboard', 'matplotlib', 'scipy', 'pandas', 'tkinter'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# Filter out CUDA/NVIDIA binaries manually to reduce size
# Since we only use CPU inference for MobileNetV3
print("Filtering binaries...")
cuda_keywords = ['cublas', 'cudart', 'cudnn', 'cufft', 'curand', 'cusolver', 'cusparse', 'nvrtc', 'nvToolsExt', 'caffe2_nv']
new_binaries = []
for (name, path, typecode) in a.binaries:
    lower_name = name.lower()
    if any(k in lower_name for k in cuda_keywords):
        print(f"Removing CUDA binary: {name}")
        continue
    new_binaries.append((name, path, typecode))
a.binaries = new_binaries

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='photo_selector_engine',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

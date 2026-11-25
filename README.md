# RealMAN 验证集 4 个场景（6 个通道）

供服务器上做实录微调使用（微调场景 OfficeRoom1、LivingRoom6、LivingRoom8；挑选模型用 Auditorium；与测试集 5 个场景不重叠）。本分支只放数据，代码在 `scene1-nn-v0` 分支。

## 来源与许可

- 数据集：RealMAN（AISHELL），https://huggingface.co/datasets/AISHELL/RealMAN ，许可 **CC BY 4.0**。
- 内容：验证集（val）中 Auditorium、LivingRoom6、LivingRoom8、OfficeRoom1 四个场景的 ma_noisy_speech 录音，
  只保留阵列 x 轴上的 6 个通道（CH13、CH5、CH0、CH1、CH9、CH17，即 -6 / -3 / 0 / 3 / 6 / 9 cm），原始 48 kHz flac；
  另含官方方位标注 `val_static_source_location.csv`、`val_moving_source_location.csv`。未做其他修改。

## 使用

`realman_val/` 下是一个 tar 包切成的 18 块（每块 95 MB），拼起来后核对 SHA256（见 `realman_val/SHA256.txt`）再解压到 `code/ssl_baseline/work/`，得到 `work/realman_val/`。

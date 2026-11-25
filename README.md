# RealMAN 测试集 5 个场景（6 个通道）

供服务器上做实录评测使用。本分支只放数据，代码在 `scene1-nn-v0` 分支。

## 来源与许可

- 数据集：RealMAN（AISHELL），https://huggingface.co/datasets/AISHELL/RealMAN ，许可 **CC BY 4.0**。
- 内容：测试集（test）中 Classroom2、LivingRoom2、OfficeLobby、OfficeRoom3、OfficeRoom4 五个场景的 ma_noisy_speech 录音，
  只保留阵列 x 轴上的 6 个通道（CH13、CH5、CH0、CH1、CH9、CH17，即 -6 / -3 / 0 / 3 / 6 / 9 cm），原始 48 kHz flac；
  另含官方方位标注 `test_static_source_location.csv`、`test_moving_source_location.csv`。未做其他修改。
- 处理方式见 `scene1-nn-v0` 分支的 `code/ssl_baseline/scripts/download_realman_scenes.sh`。

## 使用

`realman_test/` 下是一个 tar 包切成的 9 块（每块 95 MB，GitHub 单文件上限 100 MB），拼起来后核对 SHA256 再解压：

```bash
cd ~/ssl-scene1-scene1-nn-v0/code/ssl_baseline/work
cat ~/realman_parts/realman_test_6ch.tar.part_* > realman_test_6ch.tar
sha256sum realman_test_6ch.tar        # 应与 realman_test/SHA256.txt 一致
tar -xf realman_test_6ch.tar && rm realman_test_6ch.tar    # 得到 work/realman/
```

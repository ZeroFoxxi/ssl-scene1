param([string]$out)
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice('Microsoft Zira Desktop')
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile($out, $fmt)
$s.Rate = 1
$s.Speak('Good evening and welcome to the news. Tonight we have stories from around the world. The weather will be sunny tomorrow with light winds in the afternoon. In sports, the home team won the match after a long and exciting game. Scientists announced a new discovery about the ocean and its role in the climate. Markets were mixed today as investors waited for more information. Stay with us for more updates after the break, and thank you for watching our program tonight.')
$s.Dispose()

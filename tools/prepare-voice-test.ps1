$voiceTestDir = [IO.Path]::Combine((Get-Location).ProviderPath, '.cache', 'voice')
[IO.Directory]::CreateDirectory($voiceTestDir) | Out-Null
Add-Type -AssemblyName System.Speech
$voiceSynth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voiceSynth.SelectVoice('Microsoft Haruka Desktop')
$voiceFormat = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$voicePhrases = @{
 hello='こんにちは。一緒に絵しりとりをしよう。'
 chatColor='好きな色は何色？理由も少し教えて。'
 chatRemember='私は青い色が好きなんだ。覚えておいて。'
 chatRecall='さっき私が好きだと言った色は、何色だった？'
 chatFeeling='今日はちょっと疲れたな。少しだけ話そう。'
 reject='ヒントはいらない。まだ考えるね。'
 hint='ヒントちょうだい。'
 confirm='はい、ヒントをお願いします。'
 repeat='同じヒントをもう一度言って。'
 next='もう少しヒントを教えて。'
 answer='答えを教えて。'
 explain='いまの読みはどういう意味？'
 memory='さっき見つけた言葉を覚えてる？'
 correction='やっぱりヒントは言わないで。お願いは取り消すね。'
}
try {
 foreach ($voicePhrase in $voicePhrases.GetEnumerator()) {
  $voiceSynth.SetOutputToWaveFile([IO.Path]::Combine($voiceTestDir, $voicePhrase.Key + '.wav'), $voiceFormat)
  $voiceSynth.Speak($voicePhrase.Value)
  $voiceSynth.SetOutputToNull()
 }
 Write-Output 'Created synthetic Japanese test audio locally. No API calls.'
} finally { $voiceSynth.Dispose() }

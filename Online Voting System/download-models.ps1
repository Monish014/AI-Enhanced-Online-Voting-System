$modelsDir = "C:\Users\monis\Downloads\Online Voting System\frontend\public\models"
$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

$files = @(
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2",
  "face_expression_recognition_model-weights_manifest.json",
  "face_expression_recognition_model-shard1"
)

foreach ($file in $files) {
  $url = "$baseUrl/$file"
  $dest = "$modelsDir\$file"
  Write-Host "Downloading $file ..."
  try {
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 60
    Write-Host "  OK" -ForegroundColor Green
  } catch {
    Write-Host "  FAILED: $_" -ForegroundColor Red
  }
}
Write-Host "All done!" -ForegroundColor Cyan

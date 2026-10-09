param([ValidateSet('exterior','apartamento')][string]$Scene,[int[]]$Frames=@(1,2,3))
$ErrorActionPreference='Stop'
$project='\\192.168.18.16\RenderNetwork\Projetos\Botanique-Home-Resort'
$source=Join-Path $project "02-modelos\botanique-$Scene.blend"
if(!(Test-Path -LiteralPath $source -PathType Leaf)){throw 'Modelo ausente'}
if(!$Frames -or ($Frames|Where-Object{$_ -lt 1 -or $_ -gt 6})){throw 'Somente quadros de apresentacao revisados'}
$id='botanique-'+$Scene+'-'+(Get-Date -Format yyyyMMdd-HHmmss)
$batch=Join-Path $project "04-renders\$id"
New-Item -ItemType Directory -Path $batch -ErrorAction Stop | Out-Null
$pinned=Join-Path $batch "botanique-$Scene.blend"
Copy-Item -LiteralPath $source -Destination $pinned -ErrorAction Stop
$tasks=@();$nodes=@('rn-desktop-ok7426j','rn-desktop-90mn4do');$index=0
foreach($frame in $Frames){
 $taskId=$id+'-f'+$frame.ToString('D6')
 $request=Join-Path $batch ($taskId+'.json')
 @{task_id=$taskId;frame=$frame;blendfile=$pinned;output_root=(Join-Path $batch 'resultados')} | ConvertTo-Json | Set-Content -LiteralPath $request -Encoding UTF8
 $tasks+=@{id=$taskId;type=$nodes[$index%2];file=$request};$index++
}
$job=@{name=$id;type='rendernetwork-cycles';priority=50;submitter_platform='windows';settings=@{manifest=(@{tasks=$tasks}|ConvertTo-Json -Depth 5 -Compress)}}
$job | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $batch 'submission.json') -Encoding UTF8
@{sha256=(Get-FileHash -LiteralPath $pinned -Algorithm SHA256).Hash;source=$source;pinned=$pinned;frames=$Frames;nodes=$nodes;submitted_at=(Get-Date).ToString('o')} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $batch 'provenance.json') -Encoding UTF8
$response=Invoke-RestMethod 'http://192.168.18.16:8080/api/v3/jobs' -Method Post -ContentType application/json -Body ($job|ConvertTo-Json -Depth 8)
$response | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $batch 'job.json') -Encoding UTF8
@{id=$response.id;batch=$batch;frames=$Frames;nodes=$nodes}|ConvertTo-Json -Depth 4

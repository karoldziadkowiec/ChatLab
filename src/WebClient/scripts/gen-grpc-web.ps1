$ErrorActionPreference = 'Stop'

Push-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
try {
    $root = Resolve-Path "$PSScriptRoot\.." | Select-Object -ExpandProperty Path
    $tools = Join-Path $root 'tools'
    $outDir = Join-Path (Join-Path $root 'src') 'grpc'
    $protoDir = Resolve-Path (Join-Path $root '..\Services\CoreService\Protos') | Select-Object -ExpandProperty Path
    $protoFile = Join-Path $protoDir 'chat.proto'

    if (-not (Test-Path $tools)) { New-Item -ItemType Directory -Path $tools | Out-Null }
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

    $protocUrl = 'https://github.com/protocolbuffers/protobuf/releases/download/v21.12/protoc-21.12-win64.zip'
    $protocZip = Join-Path $tools 'protoc.zip'
    $protocExe = Join-Path $tools 'protoc.exe'
    $protoInclude = Join-Path $tools 'include'
    if (-not (Test-Path $protocExe)) {
        Write-Host 'Downloading protoc...'
        Invoke-WebRequest -Uri $protocUrl -OutFile $protocZip
        $unzipDir = Join-Path $tools 'protoc_unzip'
        if (Test-Path $unzipDir) { Remove-Item -Recurse -Force $unzipDir }
        Expand-Archive -Path $protocZip -DestinationPath $unzipDir
        Copy-Item (Join-Path $unzipDir 'bin\protoc.exe') $protocExe -Force
        if (Test-Path $protoInclude) { Remove-Item -Recurse -Force $protoInclude }
        Copy-Item (Join-Path $unzipDir 'include') $protoInclude -Recurse -Force
    }
    if (-not (Test-Path $protoInclude)) {
        Write-Host 'Fetching protoc includes...'
        if (-not (Test-Path $protocZip)) {
            Invoke-WebRequest -Uri $protocUrl -OutFile $protocZip
        }
        $unzipDir = Join-Path $tools 'protoc_unzip'
        if (Test-Path $unzipDir) { Remove-Item -Recurse -Force $unzipDir }
        Expand-Archive -Path $protocZip -DestinationPath $unzipDir
        if (Test-Path $protoInclude) { Remove-Item -Recurse -Force $protoInclude }
        Copy-Item (Join-Path $unzipDir 'include') $protoInclude -Recurse -Force
    }

    $pluginUrl = 'https://github.com/grpc/grpc-web/releases/download/1.4.2/protoc-gen-grpc-web-1.4.2-windows-x86_64.exe'
    $pluginExe = Join-Path $tools 'protoc-gen-grpc-web.exe'
    if (-not (Test-Path $pluginExe)) {
        Write-Host 'Downloading protoc-gen-grpc-web...'
        Invoke-WebRequest -Uri $pluginUrl -OutFile $pluginExe
    }

    $env:PATH = "$tools;$env:PATH"

    # Ensure protoc-gen-js and grpc-web plugin paths are available on PATH
    $nodeBin = Join-Path $root 'node_modules\\.bin'
    if (-not (Test-Path (Join-Path $nodeBin 'protoc-gen-js.cmd'))) {
        Write-Host 'Installing protoc-gen-js dev dependency...'
        Push-Location $root
        try {
            npm install --no-fund --no-audit --legacy-peer-deps protoc-gen-js --save-dev
        } finally {
            Pop-Location
        }
    }

    $env:PATH = "$nodeBin;$tools;$env:PATH"

    # Generate JS protobuf messages and TS gRPC-Web client
    & $protocExe -I $protoDir -I $protoInclude $protoFile --js_out=import_style=commonjs,binary:$outDir --grpc-web_out=import_style=typescript,mode=grpcwebtext:$outDir
    Write-Host "Generated gRPC-Web stubs (chat_pb.js, chat_grpc_web_pb.ts) into $outDir"
}
finally {
    Pop-Location
}

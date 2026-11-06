# FIVEFOLD

Godot **4.7.2**로 만든 모바일 5버튼 리듬 게임 프로토타입입니다.

[화면 미리보기](docs/preview.png)

- 5개 레인 멀티터치, PC `D / F / Space / J / K`
- 탭·롱노트, 판정·콤보·정확도·최고 점수
- **Chorus Encore `.sng` 직접 불러오기**: 실제 채보·음원, BPM 변화, 최대 4단계 난이도, 악기 선택
- 노트 속도 0.6–2.0배, 타이밍 오프셋 ±500ms
- 일시정지·재시작·결과 화면, 다른 탭으로 이동하면 자동 일시정지
- SNG 패키지 128MB 이하 / 10분 이하, OGG·Opus·MP3·WAV 등 브라우저 지원 음원과 여러 악기 음원 믹싱
- MP3 / OGG Vorbis / PCM WAV 단독 음원도 지원 (40MB 이하, 자동 생성 연습 패턴)
- 서버 업로드 없이 브라우저 안에서 처리. 로컬 파일은 저장하지 않으며 새로고침하면 다시 선택해야 합니다.

## 음악과 채보

공개 데모 **NIGHT CIRCUIT**은 이 프로젝트를 위해 직접 합성한 123 BPM, 약 68초 분량의 오리지널 음악입니다. 오디오·벡터 아트·채보는 외부 곡이나 샘플을 복제하지 않았습니다.

요청된 Metallica **Enter Sandman**의 음원·정식 채보는 포함하지 않았습니다. 공개 재배포가 허용된 자료를 확인하지 못했습니다. [공식 곡 페이지](https://www.metallica.com/songs/enter-sandman.html)의 권리 표기를 참고하세요.

## SNG 사용법

1. [Chorus Encore](https://www.enchor.us/)에서 원하는 곡을 `.sng` 형식으로 받습니다.
2. 게임의 **IMPORT .SNG / LOCAL AUDIO**를 누르고 `.sng` 파일을 선택합니다. 압축을 풀 필요가 없습니다.
3. 로딩이 끝나면 곡 제목·가수와 실제 제공되는 난이도가 표시됩니다. 없는 난이도는 비활성화됩니다.
4. 악기 버튼에서 **GUITAR / BASS / RHYTHM / CO-OP / KEYS** 중 파일에 있는 파트를 선택합니다.
5. **PLAY SESSION**을 누릅니다. 패키지의 실제 노트 시각과 음원을 사용하므로 BPM을 직접 맞출 필요가 없습니다.

지원 범위:

- `SNGPKG` v1 컨테이너, 내부 `notes.chart` 또는 PPQN 방식 MIDI `notes.mid` (SMF 0/1)
- 기타·베이스 등 5프렛 채보의 실제 BPM 변화, 코드, 롱노트, `.chart` Offset / SNG·INI delay
- Easy / Medium / Hard / Expert 중 파일에 들어 있는 난이도만 제공
- Strum / HOPO / Tap은 모두 해당 레인 누르기로 플레이하며, Open 노트는 가운데 레인으로 변환
- 같은 레인에서 다음 노트가 먼저 시작하면 기존 롱노트 꼬리를 짧게 조정
- 드럼·6프렛·프로 기타 전용 채보는 지원하지 않으며 명확한 오류를 표시
- 오디오 해독은 브라우저 코덱 지원에 따릅니다. Opus / OGG는 최신 Chrome·Firefox 권장. 실제 iPhone Safari는 미검증
- 모바일 메모리를 위해 음원을 순서대로 24kHz 스테레오로 해독·믹싱합니다. 길이가 10분 또는 파일 크기가 128MB를 넘으면 안내합니다.
- 패키지의 `preview` / `crowd` 음원은 제외하며 다른 악기 음원은 함께 재생합니다. 가사·영상·앨범 이미지는 불러오지 않습니다.
- 오류가 난 파일을 선택해도 이전에 불러온 곡은 유지됩니다. 곡 파일은 서버로 전송하거나 저장하지 않습니다.

포맷 출처: [SNG 공식 명세](https://github.com/mdsitton/SngFileFormat), [Chart 명세](https://docs.google.com/document/d/1v2v0U-9HQ5qHeccpExDOLJ5CMPZZ3QytPmAG5WF0Kzs/mobilebasic), [Clone Hero INI 안내](https://wiki.clonehero.net/books/guides-and-tutorials/page/songini-guide). 파서는 외부 라이브러리 없이 작성했습니다.

## 단독 음원 연습

직접 보유한 MP3 / OGG / WAV 음원도 같은 버튼에서 선택할 수 있습니다. SNG가 아닌 단독 음원에는 **BPM 기반 자동 생성 연습 패턴**을 적용합니다. 원곡에 맞춘 채보·비트 분석 기능은 아닙니다. 설정의 `PRACTICE BPM`, `FIRST NOTE`로 템포와 첫 노트 시작 시점을 조절하세요. 기본값은 123 BPM / 4초이며, 실제 음원에 맞게 조정해야 합니다. 곡 전체에 고정 BPM을 사용하므로 템포가 변하는 녹음과는 드리프트가 생길 수 있습니다.

## 실행 / 빌드

1. Godot **4.7.2 stable**에서 `project.godot`을 엽니다.
2. F6/F5로 실행합니다. SNG·로컬 음원 선택 기능은 웹 빌드에서 제공합니다. 네이티브 에디터 실행은 데모만 지원합니다.
3. 같은 버전의 Web export templates를 설치합니다.
4. Node.js 20 이상을 준비하고 `GODOT=/path/to/Godot_v4.7.2-stable_linux.x86_64 bash tools/build.sh`
5. `python3 -m http.server 8000 --directory docs` 후 `http://localhost:8000`에서 실행합니다. `file://`로 열지 마세요.

`docs/`에는 실제 Godot 4.7.2 싱글 스레드 WebAssembly 릴리스 빌드가 들어 있습니다. SharedArrayBuffer / COOP / COEP 헤더가 필요하지 않아 GitHub Pages에 그대로 배포할 수 있습니다. 최초 엔진 다운로드 크기는 약 40MB입니다.

## GitHub Pages 배포

저장소 **Settings → Pages**에서 아래와 같이 한 번 설정합니다.

- Source: **Deploy from a branch**
- Branch: **main**, folder: **/docs**
- **Save**

배포 후 주소: **https://obmaz.github.io/music/**

현재 연결된 GitHub 앱은 Pages 설정 API에 403을 반환하므로, 앱으로 최초 활성화할 수 없습니다. 한 번 설정하면 이후 `docs/` 변경이 push될 때 GitHub가 자동 배포합니다. 실제 배포 완료 여부는 저장소의 Pages / Actions에서 확인할 수 있습니다.

## 테스트

```sh
node --test tests/sng.test.mjs
godot --headless --path . --script tests/game_test.gd
# docs를 8765 포트에서 제공한 상태, Node + Playwright + Chromium 필요
node tests/sng_smoke.cjs
node tests/web_smoke.cjs
```

채보 정렬·롱노트 충돌, 판정 경계, 만점·콤보, 롱노트 조기 해제, 멀티터치 독립 해제, 일시정지 복원, 미입력 Miss 처리를 검증합니다. 브라우저 스모크 테스트는 `tests/web_smoke.cjs`에 있습니다 (Node + Playwright + Chromium, 로컬 서버 필요).

SNG 테스트는 공식 SngCli v0.3.0으로 생성한 두 개의 오리지널 패키지를 사용합니다. `.chart + OGG`, `MIDI + Opus/OGG`의 컨테이너·실제 노트·BPM 변화·오프셋·롱노트·실제 난이도·악기 선택·점수·일시정지·완주·잘못된 파일 처리를 검증합니다. `tests/fixtures/README.md`를 참고하세요.

검증 완료: Godot 4.7.2 헤드리스 게임 테스트, Chromium 웹 실행·플레이·일시정지·OGG 파일 선택·설정·한 곡 완주와 결과 전환, 390×844 / 480×900 / 1440×900 화면 배치. 실제 휴대폰의 Safari/Chrome에서는 아직 검증하지 않았습니다.

실제 모바일 기기의 오디오 지연·백그라운드 정책은 브라우저마다 다릅니다. 유선 이어폰과 타이밍 설정으로 조절할 수 있습니다. Android/iOS 네이티브 앱 패키지는 이번 프로토타입 범위에 포함하지 않았습니다.

## 라이선스

- 프로젝트 코드: MIT (`LICENSE`)
- `NIGHT CIRCUIT`, 생성 채보, 오리지널 벡터 아트: CC0 1.0 (`ASSETS.md`)
- DejaVu Sans 폰트: `assets/FONT-LICENSE.txt`
- 배포된 Godot 런타임: `docs/GODOT-LICENSE.txt`, `docs/GODOT-THIRD-PARTY.txt`

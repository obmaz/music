# FIVEFOLD

Godot **4.7.2**로 만든 모바일 5버튼 리듬 게임 프로토타입입니다.

[화면 미리보기](screenshots/preview.png)

- 5개 레인 멀티터치, PC `D / F / Space / J / K`
- 휴대폰에서는 고정 비율 레터박스 없이 화면 폭·높이에 맞춰 표시하며 터치 좌표도 함께 조정합니다. 노트 머리 두께는 기존 14에서 28로 확대했습니다. 글자는 실제 Label 텍스트와 MSDF 폰트로 표시하고 화면 비율을 역보정해 가로·세로로 찌그러지지 않습니다.
- 탭·롱노트, 판정·콤보·정확도·최고 점수
- 노트 성공 시 레인별 타격음, 빈 버튼에는 짧은 클릭음. 누르고 있는 동안 반복 재생하지 않으며 일시정지하면 효과음도 멈춥니다. 배경 음악과 효과음의 음량을 조정해 함께 들리도록 했습니다.
- **Chorus Encore `.sng` 직접 불러오기**: 실제 채보·음원, BPM 변화, 최대 4단계 난이도, 악기 선택
- 노트 속도 0.6–2.0배, 타이밍 오프셋 ±500ms
- 일시정지·재시작·결과 화면, 다른 탭으로 이동하면 자동 일시정지
- SNG 패키지 128MB 이하 / 10분 이하, OGG·Opus·MP3·WAV 등 브라우저 지원 음원과 여러 악기 음원 믹싱
- MP3 / OGG Vorbis / PCM WAV 단독 음원도 지원 (40MB 이하, 자동 생성 연습 패턴)
- 서버 업로드 없이 브라우저 안에서 처리. 로컬 파일은 저장하지 않으며 새로고침하면 다시 선택해야 합니다.

## 음악과 채보

공개 데모 **NIGHT CIRCUIT**은 이 프로젝트를 위해 직접 합성한 123 BPM, 약 68초 분량의 오리지널 음악입니다. 오디오·벡터 아트·채보는 외부 곡이나 샘플을 복제하지 않았습니다.

요청된 Metallica **Enter Sandman**의 음원·정식 채보는 포함하지 않았습니다. 공개 재배포가 허용된 자료를 확인하지 못했습니다. [공식 곡 페이지](https://www.metallica.com/songs/enter-sandman.html)의 권리 표기를 참고하세요.

## 뒤로가기와 앱 설치

- 플레이 중 Android/브라우저 뒤로가기 또는 Escape → **SESSION PAUSED** 팝업. 음악과 채보가 함께 멈춥니다.
- 팝업에서 **RESUME SESSION**으로 재개하거나 **RESTART / BACK TO TRACKS**를 선택합니다. 반복해서 뒤로가기를 눌러도 게임이 자동 재개되거나 사이트 밖으로 이동하지 않습니다.
- 설정에서 뒤로가기 → 설정 저장 후 게임 메뉴. 메뉴에서 뒤로가기 → 앱 안의 **CONTINUE** 팝업.
- **SETTINGS → INSTALL APP**: Chrome/Android 등 설치 요청을 지원하는 환경에서는 브라우저 설치창을 엽니다. 설치창을 제공하지 않는 환경에서는 브라우저 메뉴로 설치하는 방법을 안내합니다.
- iPhone/iPad는 공유 메뉴 → **홈 화면에 추가** → **추가** 안내를 제공합니다. 홈 화면에서 실행하면 **APP INSTALLED**로 표시됩니다.
- **SETTINGS → FULLSCREEN / EXIT FULLSCREEN**으로 브라우저 전체화면을 켜거나 끕니다. 지원하지 않거나 요청이 거절되면 안내를 표시합니다. 플레이 중 Escape/Android Back 등으로 전체화면을 빠져나오면 게임과 음악도 멈춥니다.
- 설치 앱의 manifest 기본 모드는 **fullscreen**입니다. Fullscreen API와 별개인 설치 앱 전체화면도 감지해서 **FULLSCREEN ON / APP INSTALLED**로 표시합니다. 브라우저·OS가 fullscreen 실행 모드를 지원하지 않으면 주소창 없는 standalone 모드로 대체될 수 있습니다. 기존 설치 앱은 브라우저의 manifest 업데이트 적용 전까지 이전 실행 모드를 유지할 수 있으므로, 반영되지 않으면 재설치하세요.
- 설치한 앱은 전체화면을 기본으로 실행합니다. 최초 실행 후 캐싱이 완료되면 데모 게임과 로컬 SNG 불러오기를 오프라인으로도 사용할 수 있습니다. SNG 파일 자체는 보관하지 않으므로 다시 선택해야 합니다.
- 서비스 워커는 현재 프로젝트 경로 범위만 캐시하며 다른 Pages 프로젝트의 캐시를 삭제하지 않습니다. 업데이트는 백그라운드에서 준비하고, 실행 중 게임을 새로고침하지 않습니다. 이후 다시 열 때 새 빌드를 사용합니다.

설치는 HTTPS 또는 localhost에서 지원되며, 실제 설치창 노출은 브라우저와 OS의 설치 조건에 따릅니다. 브라우저의 강제 탭 닫기·주소 직접 이동은 앱 안의 뒤로가기와 별개입니다. 실제 휴대폰의 OS 설치 화면은 아직 검증하지 않았습니다. [PWA 설치 방식](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [브라우저 뒤로가기 이벤트](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event).

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
3. 같은 버전의 Web export templates를 설치합니다. Linux x86_64에서는 `bash tools/install-godot.sh`로 공식 에디터와 Web 템플릿을 함께 설치할 수 있습니다 (SHA-512 검증).
4. Node.js 20 이상을 준비하고 `GODOT=/path/to/Godot_v4.7.2-stable_linux.x86_64 bash tools/build.sh`
5. `python3 -m http.server 8000 --directory build/web` 후 `http://localhost:8000`에서 실행합니다. `file://`로 열지 마세요.

`tools/build.sh`는 Godot 4.7.2 싱글 스레드 WebAssembly 릴리스 빌드를 `build/web/`에 생성합니다. 외부 JS 모듈과 라이선스 파일도 함께 복사합니다. 빌드 결과물은 Git에 커밋하지 않습니다. SharedArrayBuffer / COOP / COEP 헤더가 필요하지 않아 GitHub Pages에 그대로 배포할 수 있습니다. 최초 엔진 다운로드 크기는 약 40MB입니다.

## GitHub Actions로 빌드·배포

[배포 워크플로](.github/workflows/pages.yml)는 `main`에 push하거나 Actions에서 수동 실행하면 동작합니다.

1. Ubuntu 24.04 / Node 22에서 공식 **Godot 4.7.2 stable** 에디터와 같은 버전의 Web 템플릿을 준비합니다. 다운로드는 공식 SHA-512 목록으로 검증하며, 이후 실행에는 캐시를 사용합니다.
2. Godot 게임 테스트와 Node SNG 파서 테스트를 실행합니다.
3. `tools/build.sh`로 `build/web/`을 만듭니다.
4. `actions/upload-pages-artifact`로 웹 빌드를 업로드합니다.
5. 별도 배포 job이 `actions/configure-pages` / `actions/deploy-pages`로 Pages에 배포합니다.

PR에서는 테스트와 빌드만 실행합니다. Pages 배포 권한(`pages: write`, `id-token: write`)은 배포 job에만 부여하고, 별도 토큰/시크릿을 요구하지 않습니다. 사용하는 GitHub 공식 액션은 커밋 SHA로 고정했습니다.

**최초 설정:** [Settings → Pages](https://github.com/obmaz/music/settings/pages) → **Build and deployment → Source → GitHub Actions**를 선택합니다. 브랜치나 `/docs` 폴더는 선택하지 않습니다. 현재 연결된 GitHub 앱에는 Pages 최초 활성화 권한이 없으므로 이 설정은 저장소 관리자가 한 번 해야 합니다.

이후 [Actions](https://github.com/obmaz/music/actions)에서 **Build and deploy Godot to Pages → Run workflow → main**을 실행하거나, `main`에 변경 사항을 push하면 자동 배포됩니다. 최초 설정 전에 실행되어 배포가 실패했다면 설정 후 다시 실행하세요.

배포 주소: **https://obmaz.github.io/music/**

로컬에서도 `GODOT=/path/to/godot bash tools/build.sh`로 같은 테스트·빌드를 재현할 수 있습니다. 출력 위치는 첫 번째 인자로 지정할 수 있습니다 (`bash tools/build.sh build/preview`).

## 테스트

```sh
node --test tests/sng.test.mjs
godot --headless --path . --script tests/game_test.gd
# build/web을 8765 포트에서 제공한 상태, Node + Playwright + Chromium 필요
node tests/sng_smoke.cjs
node tests/web_smoke.cjs
# build/web을 8766 포트에서 제공: 실제 오디오 출력 신호 검사
node tests/audio_smoke.cjs
# build/를 8767 포트에서 제공 (/web/ 하위 경로에서 설치·오프라인·뒤로가기 검증)
node tests/app_smoke.cjs
```

채보 정렬·롱노트 충돌, 판정 경계, 만점·콤보, 롱노트 조기 해제, 멀티터치 독립 해제, 일시정지 복원, 미입력 Miss 처리를 검증합니다. 브라우저 스모크 테스트는 `tests/web_smoke.cjs`에 있습니다 (Node + Playwright + Chromium, 로컬 서버 필요).

SNG 테스트는 공식 SngCli v0.3.0으로 생성한 두 개의 오리지널 패키지를 사용합니다. `.chart + OGG`, `MIDI + Opus/OGG`의 컨테이너·실제 노트·BPM 변화·오프셋·롱노트·실제 난이도·악기 선택·점수·일시정지·완주·잘못된 파일 처리를 검증합니다. `tests/fixtures/README.md`를 참고하세요.

오디오 테스트는 Web Audio의 실제 출력 파형에서 빈 버튼 클릭음·SNG 노트 성공 타격음, 길게 누를 때 중복 재생 방지, 일시정지 후 무음을 확인합니다.

앱 테스트는 반복 뒤로가기 시 경로·음악 정지, 메뉴/설정 팝업, 설치 버튼과 설치 이벤트, iPhone 안내 분기, 실제 Chromium 설치 가능 판정, 서비스 워커 범위와 타 프로젝트 캐시 보존, 네트워크 차단 후 재실행·SNG 플레이를 검증합니다. 설정의 실제 Fullscreen API 진입·해제와 플레이 중 해제 시 일시정지도 확인합니다. 네이티브 설치창은 테스트 이벤트로 시뮬레이션하며 실제 기기 설치 검증을 대신하지 않습니다.

검증 완료: Godot 4.7.2 헤드리스 게임 테스트, Chromium 웹 실행·플레이·일시정지·OGG 파일 선택·설정·한 곡 완주와 결과 전환, 390×844 / 480×900 / 1440×900 화면 배치. 실제 휴대폰의 Safari/Chrome에서는 아직 검증하지 않았습니다.

실제 모바일 기기의 오디오 지연·백그라운드 정책은 브라우저마다 다릅니다. 유선 이어폰과 타이밍 설정으로 조절할 수 있습니다. Android/iOS 네이티브 앱 패키지는 이번 프로토타입 범위에 포함하지 않았습니다.

## 라이선스

- 프로젝트 코드: MIT (`LICENSE`)
- `NIGHT CIRCUIT`, 생성 채보, 오리지널 벡터 아트: CC0 1.0 (`ASSETS.md`)
- DejaVu Sans 폰트: `assets/FONT-LICENSE.txt`
- 배포된 Godot 런타임: `licenses/GODOT-LICENSE.txt`, `licenses/GODOT-THIRD-PARTY.txt` (웹 빌드에 함께 복사)

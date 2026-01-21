# Firebase Storage CORS 설정 가이드

사진 업로드 시 발생하는 `CORS` 오류를 해결하려면 Google Cloud Console에서 스토리지 버킷 설정을 변경해야 합니다.

아래 단계를 따라주세요.

## 1단계: Google Cloud Console 접속
1. [Google Cloud Console](https://console.cloud.google.com/)에 접속합니다.
2. 상단 프로젝트 선택 메뉴에서 **`happy-archive`** 프로젝트를 선택합니다.
3. 오른쪽 상단의 **터미널 아이콘** (>_)을 클릭하여 **Cloud Shell**을 활성화합니다.

## 2단계: 설정 파일 생성 및 적용
Cloud Shell 하단 터미널 창에 다음 명령어를 순서대로 복사해서 붙여넣고 실행하세요.

1. **설정 파일 생성**
   ```bash
   cat > cors.json <<EOF
   [
     {
       "origin": ["http://localhost:5173", "https://happy-archive.web.app", "https://happy-archive.firebaseapp.com"],
       "method": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
       "responseHeader": ["Content-Type", "x-goog-resumable"],
       "maxAgeSeconds": 3600
     }
   ]
   EOF
   ```

2. **설정 적용**
   (아래 명령어에서 `gs://` 뒤의 주소는 사용자의 실제 스토리지 버킷 주소여야 합니다. 현재 프로젝트 기준입니다.)
   ```bash
   gsutil cors set cors.json gs://happy-archive.firebasestorage.app
   ```

## 3단계: 확인
명령어가 에러 없이 실행되었다면 설정이 완료된 것입니다.
이제 로컬 웹사이트(`http://localhost:5173`)로 돌아가서 사진 업로드를 다시 시도해보세요.

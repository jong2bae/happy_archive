# Personal Photo Gallery (Happy Archive)

개인/가족을 위한 모바일 중심의 사진 갤러리 웹 애플리케이션입니다. React, Vite, Firebase를 사용하여 구축되었으며 GitHub Pages를 통해 배포됩니다.

## 주요 기능

- **갤러리**: 모든 방문자가 사진을 볼 수 있습니다. (최신순 / 랜덤 보기)
- **업로드**: 허가된 사용자(Google 로그인)만 사진을 업로드할 수 있습니다.
- **EXIF 지원**: 사진 업로드 시 촬영 날짜를 자동으로 추출하여 저장합니다.
- **정렬**: 실제 촬영 날짜를 기준으로 사진을 정렬합니다.

## 시작하기 (Getting Started)

이 프로젝트를 로컬 컴퓨터에서 실행하려면 다음 단계가 필요합니다.

### 사전 요구사항

- [Node.js](https://nodejs.org/) (버전 18 이상 권장)
- Git

### 설치 및 실행

1. **클론 및 디렉토리 이동**
   ```bash
   git clone <repository-url>
   cd happy_archive
   # 또는 이미 다운로드 받았다면 해당 폴더로 이동
   ```

2. **패키지 설치**
   필요한 라이브러리(React, Firebase, TailwindCSS 등)를 설치합니다.
   ```bash
   npm install
   ```

3. **개발 서버 실행**
   로컬에서 웹사이트를 띄웁니다.
   ```bash
   npm run dev
   ```
   실행 후 터미널에 표시되는 주소(예: `http://localhost:5173`)를 브라우저에 입력하여 접속합니다.

### 배포 (Deployment)

GitHub Pages에 배포하려면 다음 명령어를 사용합니다.

```bash
npm run deploy
```
이 명령어는 프로젝트를 빌드(`npm run build`)하고 `gh-pages` 브랜치에 업로드하여 배포를 완료합니다.

## 기술 스택

- **Frontend**: React, Vite
- **Styling**: TailwindCSS
- **Backend/Auth**: Firebase (Firestore, Authentication, Storage)
- **Deployment**: GitHub Pages

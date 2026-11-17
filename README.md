# LectureFlow

Browser-based lecture recorder and study notes workspace.

## Run locally

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173>.

## Publish with GitHub Pages

1. Create an empty GitHub repository.
2. Push this folder to the repository's `main` branch.
3. Open **Settings → Pages** and choose **GitHub Actions** as the source.
4. The included workflow deploys the site automatically after each push.

The app records audio in the browser and stores notes/transcripts in that browser's local storage. GitHub Pages hosts the interface but does not synchronize recordings or notes between devices. Cross-device sync will require adding authentication and a database/storage service.


# Time & Pay Tracker V1.9 — GitHub Pages

This build keeps the Android/APK app and adds a GitHub Pages web deployment.

## What is already configured

- Expo Router static web output.
- GitHub Pages repository sub-path handling.
- Automatic GitHub Actions deployment.
- Browser CSV downloads for saved time cards.
- React 19.2.3 / React DOM 19.2.3 pins from the APK dependency fix.
- Android APK/EAS configuration remains included.

## Easiest GitHub setup

### 1. Create a repository

On GitHub, create a new repository. Example:

    TimePayTracker

The repository can have any name. The workflow detects the repository name
automatically, so you do not need to edit Expo's base URL.

Do NOT initialize the new GitHub repository with a README if you plan to push
this whole folder using Git.

### 2. Upload/push this project

The root of the GitHub repository should contain:

    app/
    src/
    .github/
    app.json
    app.config.js
    package.json
    eas.json
    ...

Do not upload the outer ZIP itself as the only repository file.

### 3. Enable GitHub Pages

In the GitHub repository:

    Settings
      → Pages
      → Build and deployment
      → Source
      → GitHub Actions

### 4. Deploy

Push/commit the project to the `main` branch.

The included workflow:

    .github/workflows/deploy-pages.yml

will automatically:

1. Use Node 22.13.0.
2. Run npm install.
3. Run Expo Doctor.
4. Export the app as a static web project.
5. Detect the GitHub repository name and configure Expo's baseUrl.
6. Upload the `dist` folder.
7. Deploy it to GitHub Pages.

Watch progress in:

    Repository → Actions

When complete, GitHub Pages will show the website URL.

For a normal project repository it will usually be:

    https://YOUR-USERNAME.github.io/YOUR-REPOSITORY-NAME/

If the repository itself is named `YOUR-USERNAME.github.io`, it will be hosted
at the root instead.

## Test the web app locally

Install dependencies:

    npm install

Start web development mode:

    npx expo start --web

Or test a production static export:

    npx expo export --platform web

The output is placed in:

    dist/

## Important: local data

The current application stores employee/time-card information in local
AsyncStorage.

On the web, this means data is stored in that browser. For example:

- Chrome on your PC has its own data.
- Chrome on an Android phone has its own data.
- The installed Android APK has its own data.

They do not currently sync with each other.

A cloud database/account system is required before one employee's phone and a
manager's web browser can share the same time data.

## CSV export on web

Saved time cards now download directly as `.csv` files in the browser. The web
build does not try to use the Android/iOS file sharing API.

## Updating the live website

After changing the app, commit/push the changes to `main`. GitHub Actions will
automatically rebuild and redeploy the site.

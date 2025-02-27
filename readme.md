# Code Server PWA

## Overview

This project is a **Progressive Web App (PWA)** that provides an optimized experience for running **Code Server** on iPadOS. It includes an **on-screen virtual keyboard** with essential terminal keys for better usability.

## Features

- **Full-screen PWA experience** (no browser UI)
- **Virtual keyboard overlay** for terminal keys (Ctrl, Arrow keys, C, V, etc.)
- **Dockerized deployment** for running on an LXC container
- **Tailscale integration** for secure HTTPS access

## Installation & Setup

### 1. Deploy via Docker

Ensure Docker is installed on your LXC container.

#### **Clone the Repository**

```sh
mkdir -p ~/code-server-pwa && cd ~/code-server-pwa
git clone https://github.com/your-repo/code-server-pwa.git .
```

#### **Build and Run the Container**

```sh
docker build -t code-server-pwa .
docker run -d -p 8080:80 --name code-server-pwa code-server-pwa
```

Or use `docker-compose`:

```sh
docker-compose up -d --build
```

### 2. Access the PWA

- Open **Safari or Chrome** on your iPad.
- Navigate to `http://your-lxc-ip:8080` (or via **Tailscale**).
- Tap **"Add to Home Screen"** for a full-screen PWA experience.

### 3. Updating the PWA

After modifying the source files, rebuild and restart:

```sh
docker build -t code-server-pwa .
docker stop code-server-pwa && docker rm code-server-pwa

docker run -d -p 8080:80 --name code-server-pwa code-server-pwa
```

Or with `docker-compose`:

```sh
docker-compose up --build -d
```

## Configuration

### Setting up `env.js` for Environment Variables

To configure the Code Server URL dynamically, create an `env.js` file in the project root and include the following content:

```javascript
window.ENV = {
    CODE_SERVER_URL: "https://your-code-server-url"
};
```

Ensure `index.html` includes `env.js` by adding this line in the `<head>` section:

```html
<script src="env.js"></script>
```

This setup allows you to modify the `CODE_SERVER_URL` without changing the source code directly. If using Docker, this file will be automatically generated based on environment variables.

### Organizing Images

To keep images organized, use the following directory structure:

- **App Icons** → Store icons in the `/icons/` directory:
  - `icons/icon-192x192.png`
  - `icons/icon-512x512.png`
- **Screenshots & Other Assets** → Place additional images in `/assets/`:
  - `assets/screenshot-home.png`
  - `assets/screenshot-keyboard.png`

### Referencing Images in the README

To include images in the README, use the following syntax:

```md
![PWA Home Screen](assets/screenshot-home.png)
```

This ensures the images are properly displayed in documentation and hosted within the project structure.

### Setting up `env.js` for Environment Variables

To configure the Code Server URL dynamically, create an `env.js` file in the project root and include the following content:

```javascript
window.ENV = {
    CODE_SERVER_URL: "https://your-code-server-url"
};
```

Ensure `index.html` includes `env.js` by adding this line in the `<head>` section:

```html
<script src="env.js"></script>
```

This setup allows you to modify the `CODE_SERVER_URL` without changing the source code directly. If using Docker, this file will be automatically generated based on environment variables.

- \*\*Modify \*\*\`\` to set your `code-server-url`.
- \*\*Edit \*\*\`\` for PWA customization.
- **Ensure ****\`\`**** directory** has valid app icons (192x192, 512x512).

## License

MIT License

## Contributions

Feel free to fork and submit PRs to enhance functionality!


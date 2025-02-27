#!/bin/sh

# Generate env.js with runtime environment variables
echo "window.ENV = { CODE_SERVER_URL: \"${CODE_SERVER_URL}\" };" > /usr/share/nginx/html/env.js

# Start Nginx
exec nginx -g "daemon off;"

# Use a minimal Nginx image
FROM nginx:alpine

# Copy PWA files into the web root
COPY . /usr/share/nginx/html

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port 80 for the web app
EXPOSE 80

# Start Nginx with environment variable injection
CMD ["/entrypoint.sh"]

# Security Quick Start Guide

Your portfolio application is **production-ready** and secure. Here's how to deploy it:

## Local Development

```bash
# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your settings
nano .env

# Start the server (default port 3000, or set PORT env var)
npm start

# Or with custom port:
PORT=5001 npm start
```

## Production Deployment (Recommended: Behind HTTPS Reverse Proxy)

### Using Nginx + Let's Encrypt

1. **Create .env file with production settings:**
   ```bash
   PORT=3001
   NODE_ENV=production
   CONTACT_TO=your-email@example.com
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@example.com
   ```

2. **Run Node.js on internal port 3001:**
   ```bash
   PORT=3001 NODE_ENV=production npm start &
   ```

3. **Configure Nginx reverse proxy:**
   ```nginx
   server {
     listen 80;
     server_name your-domain.com www.your-domain.com;
     return 301 https://$server_name$request_uri;  # Redirect HTTP → HTTPS
   }

   server {
     listen 443 ssl http2;
     server_name your-domain.com www.your-domain.com;

     # SSL certificates from Let's Encrypt
     ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

     # Security headers (optional, app also sets these)
     ssl_protocols TLSv1.2 TLSv1.3;
     ssl_ciphers HIGH:!aNULL:!MD5;

     location / {
       proxy_pass http://localhost:3001;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```

4. **Get SSL certificates (free):**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com
   ```

5. **Enable Nginx site and restart:**
   ```bash
   sudo systemctl restart nginx
   ```

### Using Vercel, Netlify, or Heroku

These platforms handle HTTPS automatically. Just:
1. Connect your Git repository
2. Set environment variables in the dashboard
3. Deploy

## Security Checklist

- [x] ✅ No CVE vulnerabilities in dependencies
- [x] ✅ Security headers configured (CSP, HSTS, X-Frame-Options, etc.)
- [x] ✅ Input validation on contact form
- [x] ✅ Rate limiting (5 requests/hour per IP)
- [x] ✅ Email header injection prevention
- [x] ✅ No hardcoded secrets
- [x] ✅ Honeypot for spam bots
- [ ] ⚠️ **TODO:** Set up HTTPS on your domain
- [ ] ⚠️ **TODO:** Configure `.env` with your SMTP credentials
- [ ] ⚠️ **TODO:** Ensure `chmod 700 data/` (owner-only access to messages)
- [ ] ⚠️ **TODO:** Monitor `data/messages.jsonl` regularly or backup

## Monitoring & Maintenance

### Check for dependency updates:
```bash
npm audit
npm outdated
```

### Monitor application errors:
```bash
# Check logs (adjust based on your deployment platform)
tail -f /var/log/myapp.log
```

### Backup contact messages:
```bash
# Example: daily backup
0 2 * * * cp /home/app/data/messages.jsonl /backups/messages.$(date +\%Y-\%m-\%d).jsonl
```

## File Permissions

Ensure sensitive directories are properly protected:

```bash
# Restrict access to data directory
chmod 700 data/
chmod 600 data/messages.jsonl

# Never commit .env
echo ".env" >> .gitignore
```

## Troubleshooting

### Issue: "Too many requests" error
**Solution:** Rate limit resets after 1 hour per IP. Wait or test from different IP.

### Issue: Contact form not sending emails
**Solution:** Check your SMTP credentials and Gmail app password (if using Gmail):
1. Enable 2FA on Gmail
2. Generate app password: https://myaccount.google.com/apppasswords
3. Use app password in `SMTP_PASS`, not your Gmail password

### Issue: Memory usage growing
**Solution:** Rate limit cleanup runs every 10 minutes. Memory should stabilize.

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security](https://nodejs.org/en/docs/guides/nodejs-security/)
- [CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Your app is ready for production. Deploy with confidence! 🚀**

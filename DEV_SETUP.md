# Development Setup Guide

## 🚀 **Starting the Development Server**

### **Option 1: Standard Dev (Fixed Port 3000)**
```bash
npm run dev
```
- **Port**: Always 3000
- **Use when**: You know port 3000 is free
- **Risk**: Will fail if port 3000 is occupied

### **Option 2: Smart Dev (Auto-find Port)**
```bash
npm run dev:smart
```
- **Port**: Automatically finds available port (3000, 3001, 3002, etc.)
- **Use when**: You want to avoid port conflicts
- **Best for**: Daily development

### **Option 3: Kill All Dev Processes First**
```bash
npm run dev:kill
npm run dev
```
- **Port**: 3000 (guaranteed to be free)
- **Use when**: You want to ensure a clean start
- **Best for**: Troubleshooting

## 🛠️ **Port Conflict Solutions**

### **Quick Fix - Kill All Dev Processes**
```bash
# Kill all Next.js dev servers
npm run dev:kill

# Or manually
pkill -f "next dev"
```

### **Check What's Using Port 3000**
```bash
lsof -i :3000
```

### **Force Specific Port**
```bash
PORT=3001 npm run dev
```

## 📋 **Available Scripts**

| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run dev` | Start dev server on port 3000 | Standard development |
| `npm run dev:smart` | Auto-find available port | Avoid port conflicts |
| `npm run dev:kill` | Kill all dev processes | Clean restart |
| `npm run build` | Build for production | Testing builds |
| `npm run start` | Start production server | Production testing |

## 🔧 **Troubleshooting**

### **Port Already in Use Error**
```bash
# Solution 1: Use smart dev
npm run dev:smart

# Solution 2: Kill and restart
npm run dev:kill
npm run dev

# Solution 3: Check what's using the port
lsof -i :3000
```

### **Multiple Dev Servers Running**
```bash
# Kill all dev processes
npm run dev:kill

# Check for remaining processes
ps aux | grep "next dev"
```

### **Permission Denied on Scripts**
```bash
# Make scripts executable
chmod +x scripts/dev.sh
```

## 💡 **Best Practices**

1. **Use `npm run dev:smart`** for daily development
2. **Use `npm run dev:kill`** before starting fresh
3. **Check port usage** if you encounter conflicts
4. **Keep only one dev server** running at a time

## 🎯 **Recommended Workflow**

```bash
# Start development (smart port detection)
npm run dev:smart

# If you need to restart
npm run dev:kill
npm run dev:smart

# Build and test
npm run build
npm run start
```

This setup ensures you'll never have port conflicts again! 🎉

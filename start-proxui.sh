#!/bin/bash

echo "🚀 Démarrage de ProxUI sur l'hôte Proxmox..."
echo ""

ssh root@172.16.22.116 << 'EOF'
cd /opt/proxui

echo "1️⃣ Arrêt des processus existants..."
pkill -f 'node.*index.js' 2>/dev/null || true
sleep 2

echo "2️⃣ Démarrage du serveur..."
NODE_ENV=production node server/index.js > proxui.log 2>&1 &
PID=$!
echo $PID > proxui.pid
echo "   PID: $PID"

sleep 5

echo ""
echo "3️⃣ Vérification du démarrage..."
if ps -p $PID > /dev/null; then
    echo "   ✅ Serveur en cours d'exécution"
else
    echo "   ❌ Le serveur n'a pas démarré"
fi

echo ""
echo "4️⃣ Derniers logs:"
tail -20 proxui.log

EOF

echo ""
echo "✅ Terminé ! Accédez à ProxUI sur: http://172.16.22.116:3000"

#!/usr/bin/env node

/**
 * Script para listar usuários ou resetar senha no Supabase (desenvolvimento)
 * Uso: node reset-password.js list
 * Uso: node reset-password.js <email> <nova-senha>
 */

const https = require('https');

const SUPABASE_URL = 'https://doynzpekofzfrzhfogkw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRveW56cGVrb2Z6ZnJ6aGZvZ2t3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA1NDc2MiwiZXhwIjoyMDk2NjMwNzYyfQ.sVfzDkLJKBaf7AauJY4RkG0TJ_6xX6vz9af06i2g90M';

const args = process.argv.slice(2);

async function listUsers() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/auth/v1/admin/users`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Erro: ${res.statusCode} - ${data}`));
          return;
        }

        try {
          const response = JSON.parse(data);
          const users = response.users || [];
          
          if (users.length === 0) {
            console.log('❌ Nenhum usuário encontrado');
            resolve();
            return;
          }

          console.log(`✅ ${users.length} usuário(s) encontrado(s):\n`);
          users.forEach((u, i) => {
            console.log(`${i + 1}. ${u.email} (ID: ${u.id})`);
            console.log(`   Criado: ${new Date(u.created_at).toLocaleString('pt-BR')}`);
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function resetPassword(email, newPassword) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/auth/v1/admin/users`);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
    };

    const req1 = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Erro ao buscar usuário: ${res.statusCode} - ${data}`));
          return;
        }

        try {
          const response = JSON.parse(data);
          const users = response.users || [];
          const user = users.find(u => u.email === email);
          
          if (!user) {
            reject(new Error(`❌ Usuário com email "${email}" não encontrado`));
            return;
          }

          console.log(`✅ Usuário encontrado: ${user.email} (ID: ${user.id})`);

          const updatePath = `/auth/v1/admin/users/${user.id}`;
          const updateOptions = {
            hostname: url.hostname,
            path: updatePath,
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'apikey': SERVICE_ROLE_KEY,
              'Content-Type': 'application/json',
            },
          };

          const updateBody = JSON.stringify({ password: newPassword });

          const req2 = https.request(updateOptions, (res2) => {
            let data2 = '';
            res2.on('data', chunk => data2 += chunk);
            res2.on('end', () => {
              if (res2.statusCode !== 200) {
                reject(new Error(`Erro ao atualizar senha: ${res2.statusCode} - ${data2}`));
                return;
              }
              console.log(`✅ Senha atualizada com sucesso!`);
              console.log(`📧 Email: ${email}`);
              console.log(`🔑 Nova senha: ${newPassword}`);
              resolve();
            });
          });

          req2.on('error', reject);
          req2.write(updateBody);
          req2.end();
        } catch (err) {
          reject(err);
        }
      });
    });

    req1.on('error', reject);
    req1.end();
  });
}

// Main logic
if (args[0] === 'list') {
  listUsers()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('\n❌ Erro:', err.message);
      process.exit(1);
    });
} else if (args.length === 2) {
  resetPassword(args[0], args[1])
    .then(() => {
      console.log('\n✨ Pronto! Você já pode logar.');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Erro:', err.message);
      process.exit(1);
    });
} else {
  console.error('❌ Uso: node reset-password.js list');
  console.error('Uso: node reset-password.js <email> <nova-senha>');
  process.exit(1);
}

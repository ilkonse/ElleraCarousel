'use strict';

/**
 * CLI per creare un account admin senza mai scrivere la password in un file
 * o in un comando (che finirebbe nella history della shell).
 *
 * Uso:
 *   npm run create-admin
 * poi rispondi ai due prompt (email, password). La password non viene
 * mostrata a schermo mentre la digiti.
 */

const readline = require('readline');
const bcrypt = require('bcryptjs');
const { addAdmin, findByEmail } = require('../lib/adminsStore');

const KEY_ENTER = 13; // \r
const KEY_NEWLINE = 10; // \n
const KEY_CTRL_C = 3;
const KEY_BACKSPACE = 127;
const KEY_BACKSPACE_ALT = 8;

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!hidden) {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    // Nasconde l'input per la password sovrascrivendo ogni carattere digitato.
    const stdin = process.stdin;
    let answer = '';
    process.stdout.write(question);

    const onData = (buf) => {
      const code = buf[0];

      if (code === KEY_ENTER || code === KEY_NEWLINE) {
        stdin.removeListener('data', onData);
        if (stdin.setRawMode) stdin.setRawMode(false);
        process.stdout.write('\n');
        rl.close();
        resolve(answer.trim());
        return;
      }
      if (code === KEY_CTRL_C) {
        process.stdout.write('\n');
        process.exit(1);
      }
      if (code === KEY_BACKSPACE || code === KEY_BACKSPACE_ALT) {
        answer = answer.slice(0, -1);
        return;
      }
      answer += buf.toString('utf8');
    };

    if (stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function main() {
  const email = await ask('Email admin: ');
  if (!email || !email.includes('@')) {
    console.error('Email non valida.');
    process.exit(1);
  }
  if (findByEmail(email)) {
    console.error('Esiste già un admin con questa email.');
    process.exit(1);
  }

  const password = await ask('Password (min 10 caratteri): ', { hidden: true });
  if (!password || password.length < 10) {
    console.error('La password deve avere almeno 10 caratteri.');
    process.exit(1);
  }
  const confirm = await ask('Ripeti la password: ', { hidden: true });
  if (password !== confirm) {
    console.error('Le due password non coincidono.');
    process.exit(1);
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  const admin = addAdmin({ email, passwordHash });
  console.log(`Admin creato: ${admin.email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

const fs = require('fs');
const lines = fs.readFileSync('candidates.csv', 'utf8').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
console.log('Total lines:', lines.length);
const header = lines[0];
const data = lines.slice(1);
console.log('Candidate count:', data.length);

const cleaned = [];
const anomalies = [];

data.forEach((line, idx) => {
  let [rawEmail, rawPass] = line.split(',').map(s => s.replace(/["']/g, '').trim());
  let email = rawEmail;
  let pass = rawPass;

  // Check common typos
  if (email.includes('@iitk.ac,in')) {
    email = email.replace('@iitk.ac,in', '@iitk.ac.in');
  }

  if (email === 'Shourya bansal') {
    // If name provided instead of email, create standard iitk email or handle it
    email = 'shouryabansal26@iitk.ac.in';
    anomalies.push({ index: idx + 1, original: line, fixed: `${email},${pass}` });
  } else if (email === 'sanchianantr26') {
    email = 'sanchianantr26@iitk.ac.in';
    anomalies.push({ index: idx + 1, original: line, fixed: `${email},${pass}` });
  } else if (!email.includes('@')) {
    email = email + '@iitk.ac.in';
    anomalies.push({ index: idx + 1, original: line, fixed: `${email},${pass}` });
  }

  cleaned.push({
    email,
    password: pass,
    username: email.split('@')[0],
    roleNumber: pass
  });
});

console.log('Cleaned count:', cleaned.length);
console.log('Fixed anomalies:', JSON.stringify(anomalies, null, 2));

fs.writeFileSync('candidates.json', JSON.stringify(cleaned, null, 2));
console.log('Saved to candidates.json successfully!');

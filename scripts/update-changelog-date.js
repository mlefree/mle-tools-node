const fs = require('fs');
const path = require('path');

// Path to the CHANGELOG.md file
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');

// Get current date in YYYY-MM-DD format
const getCurrentDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Read the CHANGELOG.md file
fs.readFile(changelogPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading CHANGELOG.md:', err);
    process.exit(1);
  }

  // Get the current date
  const currentDate = getCurrentDate();
  console.log(`Current date: ${currentDate}`);

  // Find the latest version entry and update its date
  // This regex looks for the first version entry in the format: ## [x.y.z] - YYYY-MM-DD
  const updatedContent = data.replace(
    /## \[\d+\.\d+\.\d+\] - \d{4}-\d{2}-\d{2}/,
    match => {
      const versionPart = match.split(' - ')[0];
      return `${versionPart} - ${currentDate}`;
    }
  );

  // Write the updated content back to the file
  fs.writeFile(changelogPath, updatedContent, 'utf8', (writeErr) => {
    if (writeErr) {
      console.error('Error writing to CHANGELOG.md:', writeErr);
      process.exit(1);
    }
    console.log(`CHANGELOG.md updated with current date: ${currentDate}`);
  });
});

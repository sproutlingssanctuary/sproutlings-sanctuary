const fs = require('fs');

// Fix AdminView - stop keyboard shortcuts when typing in inputs
let admin = fs.readFileSync('src/components/AdminView.jsx', 'utf8');
admin = admin.replace(
  "return (",
  `// Block single-key tab shortcuts while user is typing
  React.useEffect(() => {
    const block = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', block, true);
    return () => document.removeEventListener('keydown', block, true);
  }, []);

  return (`
);
fs.writeFileSync('src/components/AdminView.jsx', admin);
console.log('Fixed!');

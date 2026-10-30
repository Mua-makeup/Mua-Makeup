const fs = require('fs');
const file = 'code/frontend/src/components/features/agency/PackageItemManager.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { useUndoDelete } from '../../../hooks/useUndoDelete';",
  "import { useUndoDelete } from '../../../hooks/useUndoDelete';\r\nimport { useToastStore } from '../../../store/useToastStore';"
);

content = content.replace(
  "  const { triggerUndoDelete } = useUndoDelete();",
  "  const { triggerUndoDelete } = useUndoDelete();\r\n  const showToast = useToastStore((state) => state.showToast);"
);

content = content.replace(
  "      resetForm();\r\n      await loadItems();",
  "      resetForm();\r\n      await loadItems();\r\n      showToast(t('save_success'), 'success');"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched PackageItemManager.jsx');


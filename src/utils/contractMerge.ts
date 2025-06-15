export type MergeData = Record<string, string | number | undefined | null>;

/**
 * Replaces {{placeholders}} in the template with values from data.
 * Removes lines where all placeholders are unanswered and renumbers visible numbered clauses.
 * Also removes label+placeholder (e.g., ', LABEL: {{id}}') if the value is empty, for all fields.
 * Handles parkingClause and storageClause custom logic.
 * @param template The contract template string with placeholders
 * @param data The object containing values to replace
 * @returns The merged contract string
 */
export default function contractMerge(template: string, data: MergeData): string {
  let processed = template;

  function formatDateDDMMYYYY(dateStr?: string | null): string {
    if (!dateStr) return '';
    // Accepts yyyy-mm-dd or ISO string
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Custom logic for parkingClause
  processed = processed.replace(/{{parkingClause}}/g, () => {
    if (data['hasParking'] === 'כן') {
      let clause = 'הדירה כוללת חניה';
      if (data['parkingNumber']) {
        const numbers = String(data['parkingNumber']).split(',').map(s => s.trim()).filter(Boolean);
        if (numbers.length > 1 || (data['parkingAmount'] && Number(data['parkingAmount']) > 1)) {
          clause += `, מספרי החניה: ${numbers.join(', ')}`;
        } else {
          clause += `, מספר החניה: ${numbers[0] || ''}`;
        }
      }
      clause += '.';
      return clause;
    }
    return '';
  });

  // Custom logic for storageClause
  processed = processed.replace(/{{storageClause}}/g, () => {
    if (data['hasStorage'] === 'כן') {
      let clause = 'הדירה כוללת מחסן';
      if (data['storageNumber']) {
        const sn = String(data['storageNumber']).trim();
        if (sn) {
          clause += `, מספר המחסן: ${sn}`;
        }
      }
      clause += '.';
      return clause;
    }
    return '';
  });

  // Custom logic for guarantorsSection
  processed = processed.replace(/{{guarantorsSection}}/g, () => {
    if (data['guarantorsCount'] && data['guarantorsCount'] !== '0') {
      let section = 'נספח: כתב ערבות\n\n(ממולא ככל שנדרשו ערבים)\n\n';
      section += 'אנו החתומים מטה מתחייבים בזאת כלפי המשכיר לכל התחייבויות השוכר לפי הסכם השכירות לעיל. אנו מאשרים כי קראנו את ההסכם, ובמיוחד את הסעיפים הנוגעים לבטחונות (סעיף 12), ומסכימים במפורש להיות ערבים לאותן התחייבויות.\n';
      if (data['guarantorsCount'] === '1' || data['guarantorsCount'] === 1) {
        section += `• ערב 1: שם: ${data['guarantor1Name'] || '______________'} | ת"ז: ${data['guarantor1Id'] || '______________'} | כתובת: ${data['guarantor1Address'] || '______________'} | טלפון: ${data['guarantor1Phone'] || '______________'}\n`;
      } else if (data['guarantorsCount'] === '2' || data['guarantorsCount'] === 2) {
        section += `• ערב 1: שם: ${data['guarantor1Name'] || '______________'} | ת"ז: ${data['guarantor1Id'] || '______________'} | כתובת: ${data['guarantor1Address'] || '______________'} | טלפון: ${data['guarantor1Phone'] || '______________'}\n`;
        section += `• ערב 2: שם: ${data['guarantor2Name'] || '______________'} | ת"ז: ${data['guarantor2Id'] || '______________'} | כתובת: ${data['guarantor2Address'] || '______________'} | טלפון: ${data['guarantor2Phone'] || '______________'}\n`;
      }
      section += '\nתאריך חתימה: ________________________';
      return section;
    }
    return '';
  });

  // Remove label+placeholder (e.g., ', LABEL: {{id}}') if the value is empty, for all fields
  // Match patterns like ', LABEL: {{id}}' or ' LABEL: {{id}}' or ' LABEL {{id}}'
  processed = processed.replace(/([,\s]*)((?:[\u0590-\u05FFa-zA-Z0-9_\-"' ]+):?\s*{{([a-zA-Z0-9_]+)}})/g, (match, prefix, labelAndPlaceholder, id) => {
    const value = data[id];
    return (value === undefined || value === null || value === '') ? '' : prefix + labelAndPlaceholder;
  });

  // Split template into lines for per-line processing
  const originalLines = processed.split('\n');
  let processedLines: string[] = [];

  for (const line of originalLines) {
    // Find all placeholders in the line
    const matches = [...line.matchAll(/{{(.*?)}}/g)];
    if (matches.length > 0) {
      // Remove line only if ALL placeholders are empty
      const allEmpty = matches.every(match => {
        const key = match[1].trim();
        const value = data[key];
        return value === undefined || value === null || value === '';
      });
      if (allEmpty) continue;
    }
    // Replace placeholders with values (leave empty if not answered)
    const replaced = line.replace(/{{(.*?)}}/g, (_, key) => {
      const k = key.trim();
      let value = data[k];
      // Format date fields
      if (["moveInDate","rentEndDate","agreementDate"].includes(k)) {
        value = formatDateDDMMYYYY(value as string);
      }
      return value !== undefined && value !== null && value !== '' ? String(value) : '';
    });
    processedLines.push(replaced);
  }

  // Remove numbered clause lines that are now empty or only contain number, whitespace, and punctuation
  processedLines = processedLines.filter(line => {
    // Remove lines like '16.' or '16.   '
    if (/^\d+\.\s*$/.test(line)) return false;
    // Existing logic for subclauses
    const numbered = line.match(/^(\d+\.\d+)\s*(.*)$/);
    if (numbered) {
      const rest = numbered[2].replace(/[\s.,:;"'״׳-]+/g, '');
      return rest.length > 0;
    }
    return true;
  });

  // Renumber only subclauses (e.g., 4.1, 4.2, ...) to be sequential within each section
  let currentSection: string | null = null;
  let subIndex = 1;
  processedLines = processedLines.map(line => {
    // Match section headers like '4. דמי שכירות ואופן תשלום' (but not subclauses)
    const sectionHeader = line.match(/^(\d+)\.\s/);
    if (sectionHeader) {
      currentSection = sectionHeader[1];
      subIndex = 1;
      return line;
    }
    // Match subclauses like '4.2 ...'
    const subMatch = line.match(/^(\d+)\.(\d+)\s/);
    if (subMatch && currentSection && subMatch[1] === currentSection) {
      const newLine = line.replace(/^(\d+)\.(\d+)/, `${currentSection}.${subIndex}`);
      subIndex++;
      return newLine;
    }
    return line;
  });

  return processedLines.join('\n');
} 
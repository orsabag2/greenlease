import contractMerge from './contractMerge';

export function generateContractHtml(answers: any, template: string, signatures?: any[]): string {
  // Flatten the data structure like contract preview does
  const flattenedAnswers = {
    ...answers,
    ...(Array.isArray(answers.landlords) && answers.landlords[0] ? answers.landlords[0] : {}),
    ...(Array.isArray(answers.tenants) && answers.tenants[0] ? answers.tenants[0] : {}),
  };
  
  // Merge contract with flattened answers
  let mergedContract = contractMerge(template, flattenedAnswers);
  
  // Apply the same processing as ContractPreviewPage
  // Remove conditional blocks (simple MVP: no #if logic)
  mergedContract = mergedContract.replace(/{{#if [^}]+}}([\s\S]*?){{\/if}}/g, (m, content) => {
    // Check if the condition is met
    const match = m.match(/{{#if \(eq ([^)]+) "([^"]+)"\)}}/);
    if (match) {
      const key = match[1].trim();
      const expectedValue = match[2].trim();
      if (flattenedAnswers[key] === expectedValue) {
        return content.trim();
      }
      return '';
    }
    
    // Fallback for simple conditions
    const simpleMatch = m.match(/{{#if ([^}]+)}}/);
    if (simpleMatch) {
      const key = simpleMatch[1].trim();
      if (flattenedAnswers[key]) return content.trim();
      return '';
    }
    
    return '';
  });

  // Clean up any remaining conditional block artifacts or extra dashes
  mergedContract = mergedContract
    .replace(/\n\s*-\s*\n/g, '\n') // Remove lines with just dashes
    .replace(/\n\s*{{#if[^}]*}}\s*\n/g, '\n') // Remove any remaining #if tags
    .replace(/\n\s*{{\/if}}\s*\n/g, '\n') // Remove any remaining /if tags
    .replace(/\n\s*-\s*$/gm, '\n') // Remove dashes at end of lines
    .replace(/^\s*-\s*\n/gm, '\n') // Remove dashes at start of lines
    .replace(/\n\s*-\s*\n/g, '\n') // Remove standalone dash lines
    .replace(/\n{3,}/g, '\n\n'); // Remove excessive newlines

  // Additional cleanup: Remove garden maintenance clause if not selected
  if (flattenedAnswers.gardenMaintenance !== "כן, ברצוני שהשוכר יהיה אחראי על תחזוקת הגינה") {
    mergedContract = mergedContract.replace(/6\.3 השוכר מתחייב לבצע תחזוקה שוטפת של הגינה הצמודה למושכר, לרבות השקיה, ניקיון וגיזום, ולשמור על מצבה התקין לאורך כל תקופת השכירות\.\n?/g, '');
    
    // Renumber the subsequent clauses after removing 6.3
    mergedContract = mergedContract
      .replace(/^6\.4/gm, '6.3')
      .replace(/^6\.5/gm, '6.4')
      .replace(/^6\.6/gm, '6.5')
      .replace(/^6\.7/gm, '6.6');
  }

  // Additional cleanup specifically for clause 6.3 area
  mergedContract = mergedContract
    .replace(/(6\.2[^\n]*)\n\s*-\s*\n(6\.3[^\n]*)/g, '$1\n$2') // Remove dash between 6.2 and 6.3
    .replace(/(6\.3[^\n]*)\n\s*-\s*\n(6\.4[^\n]*)/g, '$1\n$2') // Remove dash between 6.3 and 6.4
    .replace(/\n\s*-\s*\n/g, '\n') // Remove any standalone dash lines
    .replace(/\n\s*-\s*$/gm, '\n') // Remove dashes at end of lines
    .replace(/^\s*-\s*\n/gm, '\n') // Remove dashes at start of lines
    .replace(/\n\s*-\s*\n/g, '\n'); // Final pass to catch any remaining dashes

  // Apply bold formatting to match contract preview
  mergedContract = mergedContract
    // Add bold to main section titles (e.g., 1. פרטי המושכר, 2. תקופת השכירות, etc.)
    .replace(/^(\d+\.\s*[^<]+?)(?=\n|$)/gm, '<strong class="main-section-number" style="font-size: 1.2em; font-weight: 700;">$1</strong>')
    // Add bold to subsection numbers (e.g., 1.1, 1.2, etc.)
    .replace(/^(\d+\.\d+)(?!<)/gm, '<strong class="subsection-number">$1</strong>')
    // Add bold to "המושכר" in quotes
    .replace(/"המושכר"/g, '<strong>"המושכר"</strong>')
    // Add bold to "המשכיר" in quotes
    .replace(/"המשכיר"/g, '<strong>"המשכיר"</strong>')
    // Add bold to "השוכר" in quotes
    .replace(/"השוכר"/g, '<strong>"השוכר"</strong>')
    // Add bold to key terms
    .replace(/בין:/g, '<strong>בין:</strong>')
    .replace(/המשכיר:/g, '<strong>המשכיר:</strong>')
    .replace(/\(להלן: "המשכיר"\)/g, '(להלן: <strong>"המשכיר"</strong>)')
    .replace(/לבין:/g, '\n\n<strong>לבין:</strong>')
    .replace(/השוכר :/g, '<strong>השוכר :</strong>')
    .replace(/השוכר:/g, '<strong>השוכר:</strong>')
    .replace(/\(להלן: "השוכר"\)/g, '(להלן: <strong>"השוכר"</strong>)')
    .replace(/והואיל/g, '<strong>והואיל</strong>')
    .replace(/^הואיל/g, '<strong>הואיל</strong>');

  // Remove "⸻" characters like contract preview does
  mergedContract = mergedContract
    .replace(/⸻/g, '')
    .replace(/^\s*[-]\s*$/gm, '') // Remove standalone dash lines
    .replace(/^\s*<div><strong>-<\/strong><\/div>\s*$/gm, '') // Remove div with dash
    .replace(/^\s*<strong>-<\/strong>\s*$/gm, ''); // Remove strong with dash

  // Handle multiple tenants if present (like contract preview does)
  if (Array.isArray(flattenedAnswers.tenants) && flattenedAnswers.tenants.length > 1) {
    // Handle tenants in the main contract section (at the top)
    const tenantLines = flattenedAnswers.tenants.map((tenant: any, idx: number) => {
      const name = tenant.tenantName || '-';
      const id = tenant.tenantIdNumber || '-';
      const city = tenant.tenantCity || '-';
      const phone = tenant.tenantPhone || '-';
      return `${idx + 1}. <strong>השוכר :</strong> <strong>${name}</strong>, ת"ז <strong>${id}</strong>, עיר מגורים: <strong>${city}</strong>, טלפון: <strong>${phone}</strong>`;
    }).join('\n');
    
    // Replace only the first occurrence (in the main contract section)
    const firstOccurrence = mergedContract.indexOf('השוכר:');
    if (firstOccurrence !== -1) {
      const beforeText = mergedContract.substring(0, firstOccurrence);
      const afterText = mergedContract.substring(firstOccurrence + 7);
      const nextNewline = afterText.indexOf('\n');
      mergedContract = beforeText + tenantLines + afterText.substring(nextNewline);
    }

    // For section 15 (signatures), preserve the signature placeholders from template
    const signatureLines = flattenedAnswers.tenants.map((tenant: any, idx: number) => {
      const name = tenant.tenantName || '-';
      const id = tenant.tenantIdNumber || '-';
      return `
<div class="signature-block">
<strong>שוכר ${idx + 1}</strong>: <span class="signature-placeholder">שוכר ${idx + 1}</span>
שם: <strong>${name}</strong> | ת"ז: <strong>${id}</strong>
</div>`;
    }).join('\n');

    // Replace the signature section
    const signatureSection = `15. חתימות

<div class="signature-header">ולראיה באו הצדדים על החתום</div>

<div class="signature-block">
<strong>המשכיר</strong>:
שם: <strong>${flattenedAnswers.landlordName}</strong> | ת"ז: <strong>${flattenedAnswers.landlordId}</strong>
<div style="display: inline-block; min-width: 200px; text-align: center; margin: 10px 0; min-height: 80px;">
  <div style="height: 60px; margin-bottom: 10px;"></div>
</div>
</div>

${signatureLines}`;

    // Find and replace the entire section 15 using regex to handle formatting
    const section15Regex = /<strong[^>]*>15\.<\/strong>\s*חתימות|15\.\s*חתימות/;
    const section15Match = mergedContract.match(section15Regex);
    
    if (section15Match) {
      const section15Start = section15Match.index!;
      
      // Find the end by looking for the next ⸻ (section separator)
      const nextSectionStart = mergedContract.indexOf('⸻', section15Start + 50);
      
      if (nextSectionStart !== -1) {
        mergedContract = 
          mergedContract.substring(0, section15Start) +
          signatureSection +
          '\n\n' +
          mergedContract.substring(nextSectionStart);
      } else {
        // If no next section found, replace until end
        mergedContract = 
          mergedContract.substring(0, section15Start) +
          signatureSection;
      }
    }
  }

  // Add page break for "נספח: כתב ערבות" section
  mergedContract = mergedContract.replace(
    /(16\.\s*נספח: כתב ערבות)/g,
    '<div class="page-break-appendix" style="page-break-before: always;"></div>$1'
  );

  // Final cleanup to remove any remaining dashes (same as contract preview)
  mergedContract = mergedContract
    .replace(/\n\s*-\s*\n/g, '\n')
    .replace(/\n\s*-\s*$/gm, '\n')
    .replace(/^\s*-\s*\n/gm, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/<div><strong>-<\/strong><\/div>/g, '') // Remove HTML dash divs
    .replace(/<div>\s*<strong>-\s*<\/strong>\s*<\/div>/g, '') // Remove HTML dash divs with whitespace
    .replace(/<div>\s*-\s*<\/div>/g, '') // Remove any div containing just a dash
    .replace(/<strong>-<\/strong>/g, '') // Remove any strong tags with just a dash
    .replace(/<div>\s*<strong>-<\/strong>\s*<\/div>/g, '') // Remove div with strong dash
    .replace(/<div>\s*-\s*<\/div>/g, ''); // Remove any div with just a dash

  // Fix bullet indentation - match contract preview formatContractText function
  const lines = mergedContract.split('\n');
  const formattedLines = lines.map(line => {
    // Match different levels of numbering
    const level1Match = line.match(/^(\d+)\./); // e.g. "1."
    const level2Match = line.match(/^(\d+\.\d+)/); // e.g. "1.1"
    const level3Match = line.match(/^(\d+\.\d+\.\d+)/); // e.g. "1.1.1"
    const level4Match = line.match(/^(\d+\.\d+\.\d+\.\d+)/); // e.g. "1.1.1.1"

    if (level4Match) {
      return `            ${line}`; // 12 spaces for level 4
    } else if (level3Match) {
      return `         ${line}`; // 9 spaces for level 3
    } else if (level2Match) {
      return `   ${line}`; // 3 spaces for level 2
    } else if (level1Match) {
      return line; // No indentation for level 1
    }
    
    return line; // No indentation for regular text
  });
  mergedContract = formattedLines.join('\n');

  // Process signatures if provided
  if (signatures && signatures.length > 0) {
    signatures.forEach((signature) => {
      const signatureImage = signature.signatureImage;
      const signerName = signature.signerName;
      const signerRole = signature.signerRole;
      
      // Create signature HTML without underline
      const signatureHtml = `
        <div style="display: inline-block; min-width: 200px; text-align: center; margin: 10px 0;">
          <img src="${signatureImage}" style="max-width: 180px; max-height: 60px; display: block; margin: 0 auto 10px auto; border: none;" />
          <div style="font-size: 12px; margin-top: 10px; font-weight: bold;">${signerName}</div>
        </div>
      `;
      
      // Replace signature placeholders with actual signatures - handle multiple formats
      const placeholderPatterns = [
        new RegExp(`<span[^>]*>${signerRole}</span>`, 'g'),
        new RegExp(`<span class="signature-placeholder">${signerRole}</span>`, 'g'),
        new RegExp(`\\[${signerRole}\\]`, 'g'),
        new RegExp(`\\{${signerRole}\\}`, 'g'),
        new RegExp(`<div style="border-bottom: 1px solid #000; display: inline-block; min-width: 200px; text-align: center; margin: 10px 0;">חתימה</div>`, 'g')
      ];
      
      placeholderPatterns.forEach(pattern => {
        mergedContract = mergedContract.replace(pattern, signatureHtml);
      });
    });
  } else {
    // Keep the underline style for unsigned signatures
    mergedContract = mergedContract
      .replace(/<span class="signature-placeholder">([^<]+)<\/span>/g, '<div style="display: inline-block; min-width: 200px; text-align: center; margin: 10px 0; min-height: 80px;"><div style="height: 60px; margin-bottom: 10px;"></div></div>');
  }



  // Wrap in proper HTML structure matching contract preview exactly
  const contractHtml = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>חוזה שכירות</title>
    <link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --contract-font: 'Frank Ruhl Libre', 'Noto Sans Hebrew', Arial, sans-serif;
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Noto Sans Hebrew', Arial, sans-serif !important;
            direction: rtl !important;
            text-align: right !important;
            line-height: 1.4 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 1.05rem !important;
            color: #111 !important;
            background-color: white !important;
        }
        
        .contract-preview {
            font-family: 'Frank Ruhl Libre', Arial, sans-serif !important;
            line-height: 1.4 !important;
            white-space: pre-line !important;
            direction: rtl !important;
            color: #111 !important;
            font-size: 1.05rem !important;
        }
        
        .contract-preview p,
        .contract-preview div {
            margin: 0.2em 0 !important;
            line-height: 1.4 !important;
        }
        
        .contract-preview > div:not(:last-child) {
            margin-bottom: 0.5em !important;
        }
        
        .contract-preview div.main-section {
            margin-top: 1em !important;
            margin-bottom: 0.7em !important;
        }
        
        .contract-preview strong {
            white-space: nowrap !important;
        }
        
        .main-section {
            font-weight: 700 !important;
            font-size: 1.2em !important;
            margin-top: 1em !important;
            margin-bottom: 1em !important;
        }
        
        .contract-title {
            font-family: var(--contract-font) !important;
            font-size: 2.25rem !important;
            font-weight: bold !important;
            text-decoration: underline !important;
            text-align: center !important;
            margin-bottom: 0.2em !important;
            letter-spacing: 0.01em !important;
            color: #111 !important;
            margin-top: 2.5rem !important;
        }
        
        .contract-subtitle {
            font-family: var(--contract-font) !important;
            font-size: 1.18rem !important;
            color: #111 !important;
            text-align: center !important;
            margin-bottom: 18px !important;
            font-weight: 600 !important;
            width: inherit !important;
            margin-left: auto !important;
            margin-right: auto !important;
        }
        
        .contract-date-row {
            font-family: var(--contract-font) !important;
            font-size: 1.05rem !important;
            color: #111 !important;
            text-align: center !important;
            margin-bottom: 12px !important;
            font-weight: 400 !important;
            letter-spacing: 0.01em !important;
            line-height: 1.2 !important;
        }
        
        /* Ensure proper text direction and alignment */
        p, div, span, h1, h2, h3, h4, h5, h6 {
            direction: rtl !important;
            text-align: right !important;
        }
        
        /* Page break controls */
        .page-break {
            page-break-before: always !important;
        }
        
        .no-break {
            page-break-inside: avoid !important;
        }
        
        /* Ensure content flows properly */
        .contract-preview {
            page-break-inside: auto !important;
        }
        
        /* Force page breaks for major sections */
        div[style*="page-break-before: always"] {
            page-break-before: always !important;
        }
        
        /* PDF-specific optimizations */
        @page {
            size: A4;
        }
        
        /* Ensure text rendering */
        * {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        /* Force proper text direction for all elements */
        html, body, pre, p, div, span, h1, h2, h3, h4, h5, h6, table, td, th {
            direction: rtl !important;
            text-align: right !important;
            unicode-bidi: embed !important;
        }
        
        /* Bold text styling */
        strong {
            font-weight: 700 !important;
        }
        
        /* Main section titles - bigger and bolder */
        .main-section-number {
            font-size: 1.2em !important;
            font-weight: 700 !important;
            color: #111 !important;
        }
        
        /* Subsection numbers */
        .subsection-number {
            font-weight: 700 !important;
        }
        
        /* Force page break for נספח section */
        .page-break-appendix {
            page-break-before: always !important;
        }
        
        /* Ensure all strong elements are bold */
        strong {
            font-weight: 700 !important;
        }
        
        /* Signature styling */
        .signature-image {
            max-width: 200px !important;
            max-height: 80px !important;
            border: 1px solid #ccc !important;
            display: block !important;
            margin: 0 auto !important;
        }
        
        .signature-name {
            font-size: 12px !important;
            margin-top: 5px !important;
            font-weight: bold !important;
            text-align: center !important;
        }
        
        /* Fix dashes and bullets */
        .contract-preview div:contains("-") {
            padding-right: 2em !important;
        }
        
        /* Ensure proper spacing for numbered items */
        .contract-preview div:matches(/^\\d+\\./) {
            margin-bottom: 0.3em !important;
        }
    </style>
</head>
<body>
    <div class="contract-preview">
        <div class="contract-title">הסכם שכירות למגורים</div>
        <div class="contract-subtitle">(שכירות בלתי מוגנת)</div>
        <div class="contract-date-row">חוזה זה נחתם באמצעים דיגיטליים בהתאם לחוק חתימה אלקטרונית, התשס"א–2001.</div>
        <div style="line-height: 1.6;">
            ${mergedContract}
        </div>
    </div>
</body>
</html>`;

  return contractHtml;
}

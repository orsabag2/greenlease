export interface MergeData {
  [key: string]: string | number | boolean | null | undefined | Array<string>;
  security_types?: string[];
}

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

  // Custom logic for initial section
  processed = processed.replace(/בין:\nהמשכיר: {{landlordName}}, ת"ז {{landlordId}}, כתובת: {{landlordAddress}}, טלפון: {{landlordPhone}}\n\(להלן: "המשכיר"\)\n\nלבין\nהשוכר: {{tenantName}}, ת"ז {{tenantIdNumber}}, עיר מגורים: {{tenantCity}}, טלפון: {{tenantPhone}}\n\(להלן: "השוכר"\)/g, () => {
    const landlordDetails = [
      data['landlordName'] ? `<strong>${data['landlordName']}</strong>` : '',
      data['landlordId'] ? `ת"ז <strong>${data['landlordId']}</strong>` : '',
      data['landlordAddress'] ? `כתובת: <strong>${data['landlordAddress']}</strong>` : '',
      data['landlordPhone'] ? `טלפון: <strong>${data['landlordPhone']}</strong>` : ''
    ].filter(Boolean).join(', ');

    const tenantDetails = [
      data['tenantName'] ? `<strong>${data['tenantName']}</strong>` : '',
      data['tenantIdNumber'] ? `ת"ז <strong>${data['tenantIdNumber']}</strong>` : '',
      data['tenantCity'] ? `עיר מגורים: <strong>${data['tenantCity']}</strong>` : '',
      data['tenantPhone'] ? `טלפון: <strong>${data['tenantPhone']}</strong>` : ''
    ].filter(Boolean).join(', ');

    return `בין:
המשכיר: ${landlordDetails}
(להלן: "המשכיר")

לבין:
השוכר: ${tenantDetails}
(להלן: "השוכר")`;
  });

  // Remove sections for parking and storage if they're not included
  if (data['hasParking'] !== 'כן') {
    processed = processed.replace(/1\.4 מספר החניה: {{parkingClause}}\n/g, '');
  } else {
    // Custom logic for parkingClause
    processed = processed.replace(/1\.4 מספר החניה: {{parkingClause}}/g, () => {
      let clause = '1.4 הדירה כוללת חניה';
      if (data['parkingNumber']) {
        const numbers = String(data['parkingNumber']).split(',').map(s => s.trim()).filter(Boolean);
        if (numbers.length > 1 || (data['parkingLotCount'] && Number(data['parkingLotCount']) > 1)) {
          clause += `, מספרי החניה: <strong>${numbers.join(', ')}</strong>`;
        } else {
          clause += `, מספר החניה: <strong>${numbers[0] || ''}</strong>`;
        }
      }
      clause += '.';
      return clause;
    });
  }

  if (data['hasStorage'] !== 'כן') {
    processed = processed.replace(/1\.5 מספר המחסן: {{storageClause}}\n/g, '');
  } else {
    // Custom logic for storageClause
    processed = processed.replace(/1\.5 מספר המחסן: {{storageClause}}/g, () => {
      let clause = '1.5 הדירה כוללת מחסן';
      if (data['storageNumber']) {
        const sn = String(data['storageNumber']).trim();
        if (sn) {
          clause += `, מספר המחסן: <strong>${sn}</strong>`;
        }
      }
      clause += '.';
      return clause;
    });
  }

  // Custom logic for section 8 - pets and sublet
  processed = processed.replace(/8\. שימושים, חיות מחמד ושכירות משנה\n\n8\.1 השוכר לא יחזיק במושכר חיות מחמד אלא אם צוין אחרת בשאלה הרלוונטית בשאלון\.\n8\.2 השוכר לא יעביר זכויות, לא ישכיר בשכירות משנה, ולא יאחסן או יארח שותפים – אלא אם ניתנה הסכמה מראש ובכתב מאת המשכיר\./g, () => {
    console.log('Section 8 data:', { allowPets: data['allowPets'], allowSublet: data['allowSublet'] });
    const petsAllowed = data['allowPets'] === 'כן';
    const subletAllowed = data['allowSublet'] === 'כן';

    const section = `8. שימושים, חיות מחמד ושכירות משנה

8.1 ${petsAllowed ? 'השוכר רשאי להחזיק חיות מחמד במושכר.' : 'השוכר לא יחזיק במושכר חיות מחמד.'}
8.2 ${subletAllowed ? 'השוכר רשאי להשכיר בשכירות משנה ולארח שותפים, בכפוף להסכמת המשכיר מראש ובכתב.' : 'השוכר לא יעביר זכויות, לא ישכיר בשכירות משנה, ולא יאחסן או יארח שותפים.'}`;

    console.log('Generated section 8:', section);
    return section;
  });

  // Custom logic for tenant utilities section 9.2
  processed = processed.replace(/9\.2 תשלומים החלים על מחזיק הנכס \(כגון ארנונה, מים, חשמל, גז, ועד בית, ניהול\) – באחריות השוכר\./g, () => {
    const selectedUtilities = Array.isArray(data['tenant_utilities']) ? data['tenant_utilities'] : [];
    if (selectedUtilities.length === 0) {
      return '9.2 תשלומים החלים על מחזיק הנכס – באחריות השוכר.';
    }
    return `9.2 תשלומים החלים על מחזיק הנכס – באחריות השוכר, ובכלל זה: <strong>${selectedUtilities.join(', ')}</strong>.`;
  });

  // Custom logic for insurance section 10
  processed = processed.replace(/10\. ביטוחים[\s\S]*?⸻/g, (match) => {
    const insuranceType = data['insuranceTypes'];
    
    if (insuranceType === 'לא נדרש ביטוח') {
      return `10. ביטוחים\n\n10.1 לבקשת המשכיר, לא תחול על השוכר חובה לערוך ביטוח מכל סוג שהוא, והצדדים מוותרים על כל טענה עתידית בעניין זה, בכפוף לאחריות החוזית והנזיקית הרגילה של כל צד.\n\n⸻`;
    }

    let section = '10. ביטוחים\n\n';
    section += '10.1 השוכר מתחייב להחזיק לכל אורך תקופת השכירות ';

    switch (insuranceType) {
      case "ביטוח צד ג' בלבד":
        section += 'פוליסת ביטוח צד ג\' בתוקף.';
        break;
      case "ביטוח צד ג' + הוספת המשכיר כמבוטח":
        section += 'פוליסת ביטוח צד ג\' בתוקף. הפוליסה תכלול את המשכיר כמבוטח נוסף.';
        break;
      case "ביטוח צד ג' + ויתור שיבוב":
        section += 'פוליסת ביטוח צד ג\' בתוקף. הפוליסה תכלול סעיף ויתור על זכות השיבוב כלפי המשכיר.';
        break;
      case "ביטוח תכולה (רשות)":
        section += 'פוליסת ביטוח תכולה בתוקף, ככל שיבחר לעשות כן.';
        break;
      default:
        section += `פוליסת ביטוח בתוקף מסוג <strong>${insuranceType}</strong>.`;
    }

    section += '\n10.2 עותק מהפוליסה יימסר למשכיר לפחות 3 ימי עסקים לפני מועד הכניסה למושכר.';
    return section + '\n\n⸻';
  });

  // Defensive: If security_types does not include 'שטר חוב וערבים', treat guarantorsCount as '0'
  const securityTypes = Array.isArray(data['security_types']) ? data['security_types'] : [];
  const hasPromissoryNote = securityTypes.includes('שטר חוב וערבים');
  const effectiveGuarantorsCount = hasPromissoryNote ? data['guarantorsCount'] : '0';

  // Custom logic for guarantorsSection
  processed = processed.replace(/{{guarantorsSection}}/g, () => {
    if (hasPromissoryNote && effectiveGuarantorsCount && effectiveGuarantorsCount !== '0') {
      let section = 'נספח: כתב ערבות\n\n\n\n';
      section += 'אנו החתומים מטה מתחייבים בזאת כלפי המשכיר לכל התחייבויות השוכר לפי הסכם השכירות לעיל. אנו מאשרים כי קראנו את ההסכם, ובמיוחד את הסעיפים הנוגעים לבטחונות (סעיף 12), ומסכימים במפורש להיות ערבים לאותן התחייבויות.\n';
      if (effectiveGuarantorsCount === '1' || effectiveGuarantorsCount === 1) {
        section += `• ערב 1: שם: ${data['guarantor1Name'] || '______________'} | ת"ז: ${data['guarantor1Id'] || '______________'} | כתובת: ${data['guarantor1Address'] || '______________'} | טלפון: ${data['guarantor1Phone'] || '______________'}\n`;
        section += `<span class="signature-placeholder">ערב ראשון</span>\n`;
      } else if (effectiveGuarantorsCount === '2' || effectiveGuarantorsCount === 2) {
        section += `• ערב 1: שם: ${data['guarantor1Name'] || '______________'} | ת"ז: ${data['guarantor1Id'] || '______________'} | כתובת: ${data['guarantor1Address'] || '______________'} | טלפון: ${data['guarantor1Phone'] || '______________'}\n`;
        section += `<span class="signature-placeholder">ערב ראשון</span>\n`;
        section += `• ערב 2: שם: ${data['guarantor2Name'] || '______________'} | ת"ז: ${data['guarantor2Id'] || '______________'} | כתובת: ${data['guarantor2Address'] || '______________'} | טלפון: ${data['guarantor2Phone'] || '______________'}\n`;
        section += `<span class="signature-placeholder">ערב שני</span>\n`;
      }
      section += '\nתאריך חתימה: ________________________';
      return section;
    }
    return '';
  });

  // Custom logic for securities section 12
  processed = processed.replace(/12\. בטחונות[\s\S]*?⸻/g, () => {
    const securityTypes = Array.isArray(data.security_types) ? data.security_types : [];
    
    // If no securities required or explicitly marked as not required
    if (securityTypes.length === 0 || securityTypes.includes('לא נדרש')) {
      return `12. בטחונות\n\n` +
        `12.1 המשכיר מצהיר כי אינו דורש מהשוכר להעמיד בטחונות כלשהם במסגרת הסכם זה.\n` +
        `12.2 על אף האמור לעיל, מוסכם כי כל אחריות ו/או התחייבות של השוכר לפי הסכם זה תישאר בתוקף, וכי אי-העמדת בטחונות אינה מהווה ויתור מצד המשכיר על זכויותיו לפי דין או הסכם.\n\n⸻`;
    }

    let section = '12. בטחונות\n\n12.1 טרם הכניסה למושכר, ימציא השוכר את הבטחונות הבאים:\n';
    
    // Add promissory note and guarantors if selected
    if (hasPromissoryNote && data['guaranteeAmount']) {
      section += `• שטר חוב ע"ס <strong>${data['guaranteeAmount']}</strong> ש"ח`;
      if (data['guarantorsCount']) {
        section += `, עם <strong>${data['guarantorsCount']}</strong> ערבים לשביעות רצון המשכיר`;
      }
      section += ';\n';
    }

    // Add deposit if selected
    if (securityTypes.includes('פיקדון כספי') && data['depositAmount']) {
      section += `• פיקדון בסך <strong>${data['depositAmount']}</strong> ש"ח;\n`;
    }

    // Add bank guarantee if selected
    if (securityTypes.includes('ערבות בנקאית') && data['bankGuaranteeAmount']) {
      section += `• ערבות בנקאית בסך <strong>${data['bankGuaranteeAmount']}</strong> ש"ח;\n`;
    }

    // Add additional clauses
    if (hasPromissoryNote) {
      section += '\n12.2 ערבות הערבים ו/או שטר החוב הינם בלתי חוזרים, ויחולו גם בתקופות הארכה ככל שקיימות.';
    }
    
    section += '\n12.3 מימוש כל בטוחה ייעשה לאחר התראה בכתב של 7 ימים.';
    section += '\n12.4 ככל שהופחת ערך בטוחה עקב מימוש – על השוכר להשלים את הסכום תוך 7 ימי עסקים.';
    
    if (data['guaranteeReturnDays']) {
      section += `\n12.5 הביטחונות יושבו לשוכר תוך <strong>${data['guaranteeReturnDays']}</strong> ימים ממועד הפינוי בפועל, ובלבד שהוצגו כל הקבלות הנדרשות ולא נגרם נזק.`;
    }

    return section + '\n\n⸻';
  });

  // Custom logic for section 13.2 - sign permission
  processed = processed.replace(/13\.2 לקראת סיום תקופת השכירות, יהיה המשכיר רשאי, ככל שנבחרה אפשרות זו, להציב שלט בכניסה או על גבי הדירה לצורך מכירה או השכרה עתידית\./g, () => {
    const allowSign = data['allowSign'] === 'כן';
    return `13.2 ${allowSign ? 'לקראת סיום תקופת השכירות, יהיה המשכיר רשאי להציב שלט בכניסה או על גבי הדירה לצורך מכירה או השכרה עתידית.' : 'המשכיר לא יהיה רשאי להציב שלט בכניסה או על גבי הדירה לצורך מכירה או השכרה עתידית.'}`;
  });

  // First, let's identify which sections should be included
  const shouldIncludeParking = data['hasParking'] === 'כן';
  const shouldIncludeStorage = data['hasStorage'] === 'כן';
  const hasExtensionOption = data['hasExtensionOption'] === 'כן';
  const allowEarlyExit = data['allowEarlyExit'] === 'כן';

  // Split into lines for processing
  let lines = processed.split('\n');

  // Filter out sections based on conditions
  lines = lines.filter(line => {
    // Filter out parking if not included
    if (!shouldIncludeParking && line.includes('1.4 מספר החניה')) return false;
    
    // Filter out storage if not included
    if (!shouldIncludeStorage && line.includes('1.5 מספר המחסן')) return false;
    
    // Filter out extension sections if not selected
    if (!hasExtensionOption && (
      line.includes('2.5 הארכת תקופת השכירות') ||
      line.includes('2.6 בכפוף לעמידה בהתחייבויות, לכל אחד מהצדדים תינתן אפשרות לחדש את ההסכם')
    )) return false;
    
    // Filter out early exit section if not selected
    if (!allowEarlyExit && (
      line.includes('יציאה מוקדמת תותר') ||
      line.includes('(א) ימציא שוכר חלופי') ||
      line.includes('(ב) ישלם פיצוי מוסכם') ||
      line.includes('(ג) יעמוד בכל התחייבויותיו')
    )) return false;
    
    return true;
  });

  // Add no-extension statement if extension option is disabled
  if (!hasExtensionOption) {
    // Find the position to insert the new clause
    const insertIndex = lines.findIndex(line => line.includes('2.4')) + 1;
    if (insertIndex > 0) {
      lines.splice(insertIndex, 0, '2.5 הצדדים מסכימים כי תקופת השכירות הינה קבועה וסופית, וכי לא תתאפשר הארכתה מעבר למועד הסיום הנקוב לעיל.');
      
      // Renumber subsequent clauses
      for (let i = insertIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        const sectionMatch = line.match(/^2\.(\d+)/);
        if (sectionMatch) {
          const currentNumber = parseInt(sectionMatch[1]);
          const newNumber = currentNumber + 1;
          lines[i] = line.replace(/^2\.\d+/, `2.${newNumber}`);
        }
      }
    }
  }

  // Renumber sections if needed
  if (!shouldIncludeParking || !shouldIncludeStorage) {
    let currentMainSection = 1;
    let currentSubSection = 0;
    
    lines = lines.map(line => {
      // Match section numbers (e.g., "1.4", "1.5", etc.)
      const sectionMatch = line.match(/^(\d+)\.(\d+)/);
      if (sectionMatch) {
        const mainSection = parseInt(sectionMatch[1]);
        if (mainSection === currentMainSection) {
          currentSubSection++;
          // Replace the old section number with the new one
          return line.replace(/^\d+\.\d+/, `${currentMainSection}.${currentSubSection}`);
        } else {
          // We've moved to a new main section
          currentMainSection = mainSection;
          currentSubSection = 1;
          return line;
        }
      }
      return line;
    });
  }

  processed = lines.join('\n');

  // Insert extension rent clause if extension is enabled (BEFORE general placeholder replacement)
  let extensionRentClause = '';
  if (data['hasExtensionOption'] === 'כן' && data['extensionRent'] && String(data['extensionRent']).trim() !== '') {
    extensionRentClause = `2.7 דמי השכירות לתקופת הארכה יהיו בסך <strong>${data['extensionRent']}</strong> ש"ח.`;
  }
  processed = processed.replace(/{{extensionRentClause}}/g, extensionRentClause);
  
  // Fix numbering: if extension rent clause is inserted, change early exit from 2.7 to 2.8
  if (extensionRentClause) {
    processed = processed.replace(/^2\.7 יציאה מוקדמת/gm, '2.8 יציאה מוקדמת');
  } else if (!hasExtensionOption) {
    // If extension is disabled, early exit should be 2.8 (because we added a new 2.5 clause)
    processed = processed.replace(/^2\.7 יציאה מוקדמת/gm, '2.8 יציאה מוקדמת');
  }

  // Handle early exit compensation clause BEFORE general placeholder replacement
  processed = processed.replace(/\{\{earlyExitCompensationClause\}\}/g, () => {
    if (data.earlyExitCompensationType === '2 חודשי שכירות או מציאת שוכר חלופי') {
      return '2 חודשי שכירות או מציאת שוכר חלופי, המוקדם מביניהם';
    } else if (data.earlyExitCompensation && typeof data.earlyExitCompensation === 'string' && data.earlyExitCompensation.trim() !== '') {
      return `סך ${data.earlyExitCompensation} ש"ח`;
    } else if (data.allowEarlyExit === 'כן') {
      // If early exit is enabled but no specific compensation is set, use default
      return '2 חודשי שכירות או מציאת שוכר חלופי, המוקדם מביניהם';
    } else {
      return 'סכום שיוסכם בין הצדדים';
    }
  });

  // Replace all remaining placeholders with values
  processed = processed.replace(/{{([^}]+)}}/g, (match, key) => {
    const value = data[key.trim()];
    let displayValue;
    if (value === undefined || value === null || value === '') {
      displayValue = '-';  // Return dash for empty values
    } else {
      // Format dates
      if (["moveInDate", "rentEndDate", "agreementDate"].includes(key.trim())) {
        displayValue = formatDateDDMMYYYY(value as string) || '-';
      } else {
        displayValue = String(value);
      }
    }
    // Wrap the value in bold tags
    return `<strong>${displayValue}</strong>`;
  });

  // Generate lateInterestClause for 5.1
  let lateInterestClause = '';
  switch (data['lateInterestType']) {
    case 'לא לגבות ריבית בכלל':
      lateInterestClause = 'בגין איחור בתשלום מכל סוג שהוא, לא תגבה ריבית פיגורים.';
      break;
    case '0.03% ליום (סטנדרטי)':
      lateInterestClause = 'בגין איחור בתשלום מכל סוג שהוא, ישלם השוכר ריבית פיגורים בשיעור 0.03% ליום.';
      break;
    case 'סכום קבוע':
      lateInterestClause = `בגין איחור בתשלום מכל סוג שהוא, ישלם השוכר ריבית פיגורים בסך <strong>${data['lateInterestFixedAmount'] || '-'} ש"ח</strong> ליום.`;
      break;
    default:
      lateInterestClause = '';
  }

  // Robustly replace/remove 5.1 lines with placeholders, regardless of whitespace
  const lateInterestRegex = /^.*5\.1.*\{\{lateInterestClause\}\}.*$/gm;
  const evacuationPenaltyRegex = /^.*5\.3.*\{\{evacuationPenaltyClause\}\}.*$/gm;

  if (lateInterestClause) {
    processed = processed.replace(lateInterestRegex, `5.1 ${lateInterestClause}`);
  } else {
    processed = processed.replace(lateInterestRegex, '');
  }

  // Generate evacuationPenaltyClause for 5.3
  let evacuationPenaltyClause = '';
  switch (data['evacuationPenaltyType']) {
    case 'לא לגבות דמי שימוש בכלל':
      evacuationPenaltyClause = 'בגין איחור בפינוי המושכר, לא ייגבו דמי שימוש.';
      break;
    case 'לגבות 2% מדמי השכירות היומיים':
      evacuationPenaltyClause = 'בגין איחור בפינוי המושכר, ישלם השוכר דמי שימוש בסך 2% מדמי השכירות היומיים עבור כל יום איחור.';
      break;
    case 'לגבות 5% מדמי השכירות היומיים':
      evacuationPenaltyClause = 'בגין איחור בפינוי המושכר, ישלם השוכר דמי שימוש בסך 5% מדמי השכירות היומיים עבור כל יום איחור.';
      break;
    case 'לגבות סכום קבוע ליום':
      evacuationPenaltyClause = `בגין איחור בפינוי המושכר, ישלם השוכר דמי שימוש בסך <strong>${data['evacuationPenaltyFixedAmount'] || '-'} ש"ח</strong> ליום עבור כל יום איחור.`;
      break;
    default:
      evacuationPenaltyClause = '';
  }

  if (evacuationPenaltyClause) {
    processed = processed.replace(evacuationPenaltyRegex, `5.3 ${evacuationPenaltyClause}`);
  } else {
    processed = processed.replace(evacuationPenaltyRegex, '');
  }

  // --- Custom logic for section 6: Maintenance and Repairs ---
  processed = processed.replace(/6\.1 המשכיר יהיה אחראי לטיפול בתקלות בצנרת, חשמל, מזגן ודוד חימום\./g, () => {
    const parts = data['maintenance_responsibility'];
    if (!parts || (Array.isArray(parts) && parts.length === 0)) return '6.1 [לא נבחרו פריטים, נא לעדכן את הסעיף]';
    const arr = Array.isArray(parts) ? parts : [parts];
    const joined = arr.join(', ').replace(/, ([^,]*)$/, ' ו$1');
    return `6.1 המשכיר יהיה אחראי לטיפול בתקלות ב${joined}, ככל שהן נובעות מבלאי טבעי או ליקויים בתשתית.`;
  });

  processed = processed.replace(/6\.2 השוכר יהיה אחראי להחלפת נורות, ניקוי מסננים ותיקון נזקים שנגרמו משימוש לא תקין\./g, () => {
    const fixScope = data['tenant_fixes'];
    if (fixScope === 'כל דבר שלא נחשב תשתית') {
      return '6.2 השוכר יהיה אחראי לכל תקלה שאינה חלק ממערכות התשתית של הדירה, לרבות שימוש רגיל ותחזוקה שוטפת.';
    }
    return '6.2 השוכר יהיה אחראי להחלפת נורות, ניקוי מסננים ותיקון נזקים שנגרמו משימוש לא תקין.';
  });

  processed = processed.replace(/6\.4 אם המשכיר לא טיפל בתקלה תוך 14 ימי עסקים, השוכר יהיה רשאי לתקן אותה בעצמו ולקבל החזר, בתנאי ששלח הודעה מראש, הצעת מחיר סבירה, והמשכיר לא התנגד תוך 7 ימי עסקים\./g, () => {
    const allowFix = data['allow_tenant_fix'];
    if (typeof allowFix === 'string' && allowFix.startsWith('כן')) {
      return '6.4 אם המשכיר לא טיפל בתקלה תוך 14 ימי עסקים, השוכר יהיה רשאי לתקן אותה בעצמו ולקבל החזר, בתנאי ששלח הודעה מראש, הצעת מחיר סבירה, והמשכיר לא התנגד תוך 7 ימי עסקים.';
    }
    return '6.4 השוכר לא יהיה רשאי לבצע תיקון עצמאי בכל מקרה. כל תיקון יתבצע אך ורק על ידי המשכיר או איש מקצוע מטעמו.';
  });

  // Split into lines and process each line for final cleanup
  const finalLines = processed.split('\n').filter(line => {
    // Keep non-empty lines and lines that aren't just numbers and dots
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^\d+\.\s*$/.test(trimmed)) return false;
    return true;
  });

  // Join lines with proper spacing
  processed = finalLines.join('\n\n');

  // Replace the new section 1.1
  processed = processed.replace(
    /1\.1 המושכר הינו דירה ברחוב \{\{street\}\}(, מספר בניין \{\{buildingNumber\}\})?, מספר \{\{apartmentNumber\}\}, קומה \{\{floor\}\}, כניסה \{\{entrance\}\}, בעיר \{\{propertyCity\}\} \(להלן: "המושכר"\)\./g,
    () => {
      // Always add a space or comma between each part, even if missing
      const parts = [];
      if (data['street']) parts.push(data['street']);
      if (data['buildingNumber']) parts.push('מספר בניין ' + data['buildingNumber']);
      if (data['apartmentNumber']) parts.push('מספר דירה ' + data['apartmentNumber']);
      if (data['floor']) parts.push('קומה ' + data['floor']);
      if (data['entrance']) parts.push('כניסה ' + data['entrance']);
      if (data['propertyCity']) parts.push('בעיר ' + data['propertyCity']);
      const joined = parts.length ? parts.join(', ') : '-';
      return `1.1 המושכר הינו דירה ברחוב ${joined} (להלן: "המושכר").`;
    }
  );

  return processed;
}

export function generateSummarySection(data: MergeData): string {
  const summary = [
    'סיכום פרטי המושכר:',
    '',
    `• כתובת: ${data.street ?? '-'}${data.buildingNumber ? ' ' + data.buildingNumber : ''}${data.apartmentNumber ? ', דירה ' + data.apartmentNumber : ''}${data.floor ? ', קומה ' + data.floor : ''}${data.entrance ? ', כניסה ' + data.entrance : ''}${data.propertyCity ? ', ' + data.propertyCity : ''}`,
    `• מספר חדרים: ${data.apartmentRooms ?? '-'}`,
    `• תכולת הדירה: ${data.apartmentFeatures ?? '-'}`,
  ];

  // Add parking details
  if (data.hasParking === 'כן') {
    const parkingDetails = data.parkingNumber ? 
      `• חניה: כן, מספר${Number(data.parkingLotCount) > 1 ? 'י' : ''} חניה ${data.parkingNumber}` :
      '• חניה: כן';
    summary.push(parkingDetails);
  } else {
    summary.push('• חניה: לא');
  }

  // Add storage details
  if (data.hasStorage === 'כן') {
    const storageDetails = data.storageNumber ? 
      `• מחסן: כן, מספר מחסן ${data.storageNumber}` :
      '• מחסן: כן';
    summary.push(storageDetails);
  } else {
    summary.push('• מחסן: לא');
  }

  // Add rental period
  if (data.moveInDate || data.rentEndDate) {
    summary.push(`• תקופת השכירות: ${formatDateDDMMYYYY(data.moveInDate as string)} - ${formatDateDDMMYYYY(data.rentEndDate as string)}`);
  }

  // Add monthly rent
  if (data.monthlyRent) {
    const rent = data.monthlyRent.toString().trim();
    summary.push(`• דמי שכירות חודשיים: ${rent || '-'} ש"ח`);
  } else {
    summary.push(`• דמי שכירות חודשיים: -`);
  }

  // Add payment method
  if (data.paymentMethod) {
    summary.push(`• אמצעי תשלום: ${data.paymentMethod}`);
  } else {
    summary.push(`• אמצעי תשלום: -`);
  }

  // Add extension option
  if (data.hasExtensionOption === 'כן' && data.extensionDuration) {
    summary.push(`• אופציית הארכה: ${data.extensionDuration}`);
  }

  // Add early exit option
  if (data.allowEarlyExit === 'כן') {
    if (data.earlyExitCompensationType === '2 חודשי שכירות או מציאת שוכר חלופי') {
      summary.push(`• אפשרות יציאה מוקדמת: כן, פיצוי: 2 חודשי שכירות או מציאת שוכר חלופי`);
    } else if (data.earlyExitCompensation) {
      summary.push(`• אפשרות יציאה מוקדמת: כן, פיצוי: ${data.earlyExitCompensation}`);
    } else {
      summary.push(`• אפשרות יציאה מוקדמת: כן`);
    }
  }

  // Add pets allowance
  if (data.allowPets) {
    summary.push(`• חיות מחמד: ${data.allowPets === 'כן' ? 'מותר' : 'אסור'}`);
  } else {
    summary.push(`• חיות מחמד: -`);
  }

  // Add sublet allowance
  if (data.allowSublet) {
    summary.push(`• השכרת משנה: ${data.allowSublet === 'כן' ? 'מותר' : 'אסור'}`);
  } else {
    summary.push(`• השכרת משנה: -`);
  }

  return summary.join('\n');
} 
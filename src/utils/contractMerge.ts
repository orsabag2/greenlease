export type MergeData = Record<string, string | number | undefined | null>;

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
      line.includes('2.6 למשכיר תינתן אופציה להארכת תקופת השכירות') ||
      line.includes('2.7 על השוכר למסור הודעה מראש')
    )) return false;
    
    // Filter out early exit section if not selected
    if (!allowEarlyExit && (
      line.includes('יציאה מוקדמת תותר ככל שנבחרה האפשרות לכך') ||
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

  // Split into lines and process each line for final cleanup
  const finalLines = processed.split('\n').filter(line => {
    // Keep non-empty lines and lines that aren't just numbers and dots
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^\d+\.\s*$/.test(trimmed)) return false;
    return true;
  });

  // Join lines with proper spacing
  return finalLines.join('\n\n');
}

function generateSummarySection(data: MergeData): string {
  const summary = [
    'סיכום פרטי המושכר:',
    '',
    `• כתובת: ${data.street ?? '-'} ${data.apartmentNumber ?? ''}, קומה ${data.floor ?? '-'}, כניסה ${data.entrance ?? '-'}, ${data.propertyCity ?? '-'}`,
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
    const compensation = data.earlyExitCustomCompensation || data.earlyExitCompensation || '-';
    summary.push(`• אפשרות יציאה מוקדמת: כן, פיצוי: ${compensation}`);
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
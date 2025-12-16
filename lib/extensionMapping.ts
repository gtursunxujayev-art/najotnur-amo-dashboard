/**
 * Extension to Manager Name Mapping
 * Maps OnlinePBX extension numbers to manager names from amoCRM
 * 
 * How to use:
 * 1. Update the EXTENSION_MAP below with your extensions
 * 2. Extensions will be automatically looked up when storing webhook calls
 * 3. If an extension is not in the map, it will be stored as-is (number)
 * 
 * Last Updated: Nov 27, 2025
 */

// Manual extension-to-manager mapping
// Maps OnlinePBX/Utel/GoogleSheets extension numbers to actual manager names
export const EXTENSION_MAP: Record<string, string> = {
  "100": "Admin",
  "101": "Madina",
  "102": "Oyshaxon",
  "103": "Zilola",
  "104": "Marg'uba",
  "105": "Sabrina",
  "106": "Mumtoza",
  "107": "Matluba",
  "108": "Mohinur",
  "109": "sabina",
  "110": "Gulchehra",
  "111": "Orzugul",
};

// OnlinePBX-specific extension redirects
// Redirects calls from one extension to another BEFORE name lookup
// Example: Calls to 100 (Admin) should be counted as 108 (Mohinur)
export const ONLINEPBX_EXTENSION_REDIRECT: Record<string, string> = {
  "100": "108", // Admin calls → Mohinur
};

// Manager name redirects (when OnlinePBX sends name instead of extension)
// Maps manager names to their redirected names
export const ONLINEPBX_NAME_REDIRECT: Record<string, string> = {
  "Admin": "Mohinur", // Admin calls → Mohinur
};

/**
 * Apply OnlinePBX-specific extension redirect
 * Redirects calls from one extension to another (e.g., 100 → 108)
 * Only applies to OnlinePBX calls
 */
export function applyOnlinePbxExtensionRedirect(extension: string): string {
  if (!extension) return extension;
  
  const redirectTo = ONLINEPBX_EXTENSION_REDIRECT[extension];
  if (redirectTo) {
    console.log(`[ExtensionMapping] Redirecting OnlinePBX extension ${extension} → ${redirectTo}`);
    return redirectTo;
  }
  
  return extension;
}

/**
 * Get manager name from extension number
 * Returns manager name if found, otherwise returns extension number
 */
export function getManagerNameFromExtension(extension: string): string {
  if (!extension) return "Unknown";
  
  // Try direct mapping first
  if (EXTENSION_MAP[extension]) {
    return EXTENSION_MAP[extension];
  }
  
  // If not found, return extension as-is
  return extension;
}

/**
 * Get manager name from OnlinePBX extension with redirect applied
 * First applies any redirects (extension or name), then looks up the manager name
 */
export function getManagerNameFromOnlinePbxExtension(extensionOrName: string): string {
  if (!extensionOrName) return "Unknown";
  
  // First check if this is a name that should be redirected (e.g., "Admin" → "Mohinur")
  if (ONLINEPBX_NAME_REDIRECT[extensionOrName]) {
    const redirectedName = ONLINEPBX_NAME_REDIRECT[extensionOrName];
    console.log(`[ExtensionMapping] Redirecting OnlinePBX name "${extensionOrName}" → "${redirectedName}"`);
    return redirectedName;
  }
  
  // Apply extension-based redirect (e.g., "100" → "108")
  const redirectedExtension = applyOnlinePbxExtensionRedirect(extensionOrName);
  return getManagerNameFromExtension(redirectedExtension);
}

/**
 * Update extension mapping (can be called from API endpoint)
 * Allows dynamic mapping updates without code changes
 */
export function updateExtensionMapping(extension: string, managerName: string): void {
  EXTENSION_MAP[extension] = managerName;
  console.log(`[ExtensionMapping] Updated: ${extension} -> ${managerName}`);
}

/**
 * Get all current mappings
 */
export function getAllExtensionMappings(): Record<string, string> {
  return { ...EXTENSION_MAP };
}

/**
 * Check if a string is a phone number (not an extension)
 * Extensions are typically 3-4 digits (101-111)
 * Phone numbers are longer or have special formatting
 */
export function isPhoneNumber(caller: string): boolean {
  if (!caller) return false;
  
  const normalized = caller.trim();
  
  // If it's a known extension, it's not a phone number
  if (EXTENSION_MAP[normalized]) {
    return false;
  }
  
  // Extensions are typically 2-3 digits in 100-999 range
  // Phone numbers are longer (7+ digits) or have formatting
  const asNum = parseInt(normalized);
  
  // If it's a number 100-999, it's likely an extension
  if (!isNaN(asNum) && asNum >= 100 && asNum <= 999) {
    return false;
  }
  
  // If it's 4 digits or longer, or has non-numeric characters, it's likely a phone number
  return normalized.length > 4 || /[^\d]/.test(normalized);
}

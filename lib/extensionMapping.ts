/**
 * Extension to Manager Name Mapping
 * Maps OnlinePBX extension numbers to manager names from amoCRM
 * 
 * How to use:
 * 1. Update the EXTENSION_MAP below with your extensions
 * 2. Extensions will be automatically looked up when storing webhook calls
 * 3. If an extension is not in the map, it will be stored as-is (number)
 */

// Manual extension-to-manager mapping
// Maps OnlinePBX extension numbers to actual manager names
export const EXTENSION_MAP: Record<string, string> = {
  "100": "Mumtoza",
  "101": "Madina",
  "102": "Oyshaxon",
  "103": "Zilola",
  "104": "Marg'uba",
  "105": "Sabrina",
  "106": "Matluba",
  "107": "Sabina",
  "108": "Mohinur",
  "109": "Gulchehra",
  "110": "Orzugul",
};

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

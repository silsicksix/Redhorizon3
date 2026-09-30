export interface GeointReportData {
  targetLabel: string;
  targetType?: string;
  coords: { lat: number; lon: number } | null;
  sourceType: string;
  intelText: string | null;
  localTime?: string;
  nodesCount?: number;
  threatLevel?: string;
}

/**
 * Export GEOINT intelligence data as CSV
 */
export const exportGeointCSV = (data: GeointReportData) => {
  const timestamp = new Date().toISOString();
  const lat = data.coords ? data.coords.lat.toString() : '';
  const lon = data.coords ? data.coords.lon.toString() : '';

  const cleanIntel = (data.intelText || '')
    .replace(/"/g, '""')
    .replace(/\n/g, ' ');

  const csvRows = [
    ['METADATA_FIELD', 'VALUE'],
    ['Platform', 'Red Horizon OSINT Framework v2.9.1'],
    ['Export_Type', 'GEOINT Spatial Intelligence Report'],
    ['Timestamp', timestamp],
    ['Target_Label', data.targetLabel],
    ['Target_Type', data.targetType || 'LOCATION'],
    ['Latitude', lat],
    ['Longitude', lon],
    ['Resolution_Source', data.sourceType],
    ['Threat_Level', data.threatLevel || 'NOMINAL'],
    ['Perimeter_500m', 'High Kinetic Priority Zone'],
    ['Perimeter_1500m', 'Secondary Buffer Zone'],
    ['Perimeter_5000m', 'Macro GEOINT Reconnaissance Zone'],
    ['Intel_Summary', `"${cleanIntel}"`]
  ];

  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const filename = `GEOINT_Data_${data.targetLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * exportTimetable(elementRef, semester)
 *
 * Screenshots the element pointed to by elementRef,
 * embeds it in an A4 landscape PDF, and triggers download.
 */
export async function exportTimetable(elementRef, semester) {
  const element = elementRef.current
  if (!element) throw new Error('Nothing to export')

  const canvas = await html2canvas(element, {
    scale: 2,           // 2x for sharper output
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })

  const imgData = canvas.toDataURL('image/png')

  // A4 landscape in mm
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth  = pdf.internal.pageSize.getWidth()   // 297mm
  const pageHeight = pdf.internal.pageSize.getHeight()  // 210mm

  // Scale image to fit page width, maintaining aspect ratio
  const imgWidth  = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  // If image is taller than the page, scale down to fit height
  let finalWidth  = imgWidth
  let finalHeight = imgHeight
  if (imgHeight > pageHeight) {
    finalHeight = pageHeight
    finalWidth  = (canvas.width * finalHeight) / canvas.height
  }

  // Centre on the page
  const x = (pageWidth - finalWidth) / 2
  const y = (pageHeight - finalHeight) / 2

  pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight)
  pdf.save(`semester-${semester}-timetable.pdf`)
}
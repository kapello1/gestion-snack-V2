import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LABELS } from './constants';

export const generateOrderPDF = (order) => {
    try {
        const doc = new jsPDF();
        const isInvoice = order.documentType === 'INVOICE';
        const title = isInvoice ? 'FACTURE' : 'TICKET DE COMMANDE';

        // --- Header ---
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 105, 20, { align: 'center' });

        // Company Info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('SNACK MANAGEMENT SYSTEM', 105, 26, { align: 'center' });
        doc.text('123 Rue de la Gourmandise, 75000 Paris', 105, 30, { align: 'center' });
        doc.text('Tel: 01 23 45 67 89', 105, 34, { align: 'center' });

        doc.line(20, 38, 190, 38); // Separator

        // --- Order Details ---
        doc.setFontSize(12);

        // Left Column
        doc.text(`N° Commande: #${order.orderId || '?'}`, 20, 50);
        const dateStr = new Date(order.orderDate || order.createdAt || Date.now()).toLocaleString('fr-FR');
        doc.text(`Date: ${dateStr}`, 20, 58);

        // Right Column
        const typeLabel = order.orderType === 'ON_SITE' ? 'Sur place' : 'À emporter';
        doc.text(`Type: ${typeLabel}`, 120, 50);

        if (order.tableId) {
            doc.text(`Table: ${order.tableId}`, 120, 58);
        }

        if (order.pickupTime && order.orderType === 'TAKEAWAY') {
            doc.text(`Retrait: ${order.pickupTime}`, 120, 66);
        }

        // Customer Info
        doc.setFont('helvetica', 'bold');
        doc.text('Client:', 20, 75);
        doc.setFont('helvetica', 'normal');
        let customerName = 'Client de passage';
        if (order.customer) {
            customerName = `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim();
        } else if (order.customerName) {
            customerName = order.customerName;
        }
        doc.text(customerName, 40, 75);

        // --- Items Table ---
        const tableColumn = ["Article", "Qté", "P.U.", "Total"];
        const tableRows = [];

        if (order.orderItems && Array.isArray(order.orderItems)) {
            order.orderItems.forEach(item => {
                const unitPrice = parseFloat(item.unitPrice || 0);
                const quantity = parseInt(item.quantity || 0);
                const total = unitPrice * quantity;

                const ticketData = [
                    item.productName || `Article #${item.productId}`,
                    quantity.toString(),
                    `${unitPrice.toFixed(2)} €`,
                    `${total.toFixed(2)} €`
                ];
                tableRows.push(ticketData);
            });
        }

        autoTable(doc, {
            startY: 85,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 11 },
        });

        // --- Totals ---
        const finalY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');

        // Total Box
        doc.setDrawColor(0);
        doc.setFillColor(240, 240, 240);
        doc.rect(120, finalY - 5, 70, 15, 'F');
        const totalAmount = parseFloat(order.totalAmount || 0).toFixed(2);
        doc.text(`TOTAL: ${totalAmount} €`, 155, finalY + 4, { align: 'center' });

        // Status
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        const statusLabel = (LABELS.ORDER_STATUS && LABELS.ORDER_STATUS[order.status]) || order.status || 'Inconnu';
        doc.text(`Statut: ${statusLabel}`, 20, finalY + 5);

        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Merci de votre visite !', 105, 280, { align: 'center' });

        // --- Output & Auto-Open ---

        // Add auto-print script to PDF
        doc.autoPrint();

        // Create Blob URL
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);

        // Attempt to open in new window
        const newWindow = window.open(pdfUrl, '_blank');

        // Fallback if blocked
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            console.warn("Popup blocked. Falling back to save.");
            // If we can't open it, save it so the user can at least print it manually
            doc.save(`ticket_commande_${order.orderId || 'new'}.pdf`);
            alert("L'ouverture automatique a été bloquée. Le ticket a été téléchargé.");
        }

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Erreur lors de la génération du ticket.");
    }
};

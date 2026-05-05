from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import inch
from io import BytesIO
from datetime import datetime

def generate_business_report(business_data: dict) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=20,
        fontName='Helvetica-Bold'
    )
    
    section_style = ParagraphStyle(
        'SectionStyle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#3b82f6'),
        spaceBefore=15,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )
    
    label_style = ParagraphStyle(
        'LabelStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748b'),
        fontName='Helvetica-Bold'
    )
    
    value_style = ParagraphStyle(
        'ValueStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#0f172a'),
        fontName='Helvetica'
    )

    elements = []

    # 1. Header
    elements.append(Paragraph(f"Business Compliance Report", title_style))
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    elements.append(Spacer(1, 20))

    # 2. Business Profile
    elements.append(Paragraph("Business Profile", section_style))
    
    profile_data = [
        [Paragraph("Business Name:", label_style), Paragraph(business_data.get('name', 'N/A'), value_style)],
        [Paragraph("CR Number:", label_style), Paragraph(business_data.get('cr_number', 'N/A'), value_style)],
        [Paragraph("CR Expiry:", label_style), Paragraph(business_data.get('cr_expiry_date', 'N/A'), value_style)],
        [Paragraph("Status:", label_style), Paragraph(business_data.get('status', 'N/A'), value_style)],
        [Paragraph("Address:", label_style), Paragraph(business_data.get('address', 'N/A'), value_style)],
        [Paragraph("Mobile:", label_style), Paragraph(business_data.get('mobile', 'N/A'), value_style)],
    ]
    
    t = Table(profile_data, colWidths=[1.5*inch, 4*inch])
    t.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))

    # 3. Documents
    elements.append(Paragraph("Compliance Checklist", section_style))
    docs = business_data.get('documents', [])
    if docs:
        doc_header = [
            Paragraph("Document Type", label_style),
            Paragraph("Expiry Date", label_style),
            Paragraph("Status", label_style)
        ]
        doc_rows = [doc_header]
        for d in docs:
            expiry = d.get('expiry_date')
            if expiry:
                expiry = expiry.split('T')[0]
            else:
                expiry = "N/A"
                
            status = "AVAILABLE" if d.get('is_available') else "MISSING"
            doc_rows.append([
                Paragraph(d.get('document_type', 'N/A'), value_style),
                Paragraph(expiry, value_style),
                Paragraph(status, value_style)
            ])
        
        dt = Table(doc_rows, colWidths=[3*inch, 1.5*inch, 1*inch])
        dt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(dt)
    else:
        elements.append(Paragraph("No documents found.", value_style))
    
    elements.append(Spacer(1, 20))

    # 4. People
    elements.append(Paragraph("People & Identities", section_style))
    members = business_data.get('members', [])
    if members:
        member_header = [
            Paragraph("Name", label_style),
            Paragraph("Role", label_style),
            Paragraph("QID/ID", label_style),
            Paragraph("Expiry", label_style)
        ]
        member_rows = [member_header]
        for m in members:
            member_rows.append([
                Paragraph(m.get('name', 'N/A'), value_style),
                Paragraph(m.get('role', 'N/A'), value_style),
                Paragraph(m.get('qid_number', 'N/A'), value_style),
                Paragraph(m.get('expiry_date', 'N/A') or 'N/A', value_style)
            ])
            
        mt = Table(member_rows, colWidths=[2*inch, 1.2*inch, 1.3*inch, 1*inch])
        mt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(mt)
    else:
        elements.append(Paragraph("No personnel data found.", value_style))

    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer

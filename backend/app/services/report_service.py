"""Report generation service — PDF, CSV, XLSX exports."""

import io
import csv
import os
from datetime import datetime
from typing import Optional


async def generate_report(db, report_config: dict, user_id: str) -> dict:
    """Generate report and return bytes + metadata."""
    from app.services.analytics_service import get_overview_analytics
    from app.repositories import downtime_repository, master_repository

    plant_id = report_config["plant_id"]
    from_date = datetime.fromisoformat(report_config["from_date"])
    to_date = datetime.fromisoformat(report_config["to_date"])
    fmt = report_config.get("format", "csv")
    title = report_config.get("title", "Downtime Analysis Report")

    # Get analytics
    analytics = await get_overview_analytics(
        db, plant_id=plant_id, from_date=from_date, to_date=to_date
    )

    # Get raw events for the period
    events, _ = await downtime_repository.list_events(
        db,
        plant_id=plant_id,
        start_from=from_date,
        start_to=to_date,
        limit=50000
    )

    # Get reason labels
    reasons = await master_repository.list_reasons(db, plant_id=plant_id)
    machines_list = await master_repository.list_machines(db, plant_id=plant_id)
    reason_map = {r["id"]: r["label"] for r in reasons}
    machine_map = {m["id"]: m["name"] for m in machines_list}

    if fmt == "csv":
        return _generate_csv(events, reason_map, machine_map, analytics, title)
    elif fmt == "xlsx":
        return _generate_xlsx(events, reason_map, machine_map, analytics, title)
    else:  # pdf
        return _generate_pdf(analytics, title, plant_id, from_date, to_date)


def _generate_csv(events, reason_map, machine_map, analytics, title) -> dict:
    """Generate CSV report content."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Header section
    writer.writerow([f"# {title}"])
    writer.writerow([f"# Generated: {datetime.utcnow().isoformat()}"])
    writer.writerow([f"# Calculation Version: {analytics.get('calculation_version', '1.0.0')}"])
    writer.writerow([])

    # KPI Summary
    kpis = analytics.get("kpis", {})
    writer.writerow(["KPI SUMMARY"])
    writer.writerow(["Metric", "Value", "Unit"])
    writer.writerow(["Total Downtime", kpis.get("downtime_minutes", 0), "minutes"])
    writer.writerow(["Downtime Rate", kpis.get("downtime_rate_pct", 0), "%"])
    writer.writerow(["Availability", kpis.get("availability_pct", 0), "%"])
    writer.writerow(["Event Count", kpis.get("event_count", 0), "events"])
    writer.writerow([
        "Estimated Units Lost",
        kpis.get("estimated_units_lost", 0),
        "units (estimated)"
    ])
    writer.writerow([])

    # Events table
    writer.writerow(["DOWNTIME EVENTS"])
    writer.writerow([
        "Machine",
        "Start Time",
        "End Time",
        "Duration (min)",
        "Reason",
        "Shift",
        "Source",
        "Notes"
    ])

    for e in events:
        writer.writerow([
            machine_map.get(e.get("machine_id", ""), e.get("machine_id", "")),
            str(e.get("start_at", "")),
            str(e.get("end_at", "")),
            e.get("duration_min", ""),
            reason_map.get(e.get("reason_id", ""), e.get("reason_id", "")),
            e.get("shift_id", ""),
            e.get("source", ""),
            e.get("notes", ""),
        ])

    return {
        "content": output.getvalue().encode("utf-8"),
        "content_type": "text/csv",
        "filename": f"factorypulse_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv",
    }


def _generate_xlsx(events, reason_map, machine_map, analytics, title) -> dict:
    """Generate XLSX report content."""
    import xlsxwriter

    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)

    # Formats
    header_fmt = workbook.add_format({
        'bold': True,
        'bg_color': '#0B1420',
        'font_color': '#22C3C9',
        'border': 1
    })
    title_fmt = workbook.add_format({
        'bold': True,
        'font_size': 14,
        'font_color': '#22C3C9'
    })
    kpi_label_fmt = workbook.add_format({'bold': True})

    # Summary sheet
    ws_summary = workbook.add_worksheet("Summary")
    ws_summary.write(0, 0, title, title_fmt)
    ws_summary.write(
        1, 0,
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"
    )
    ws_summary.write(
        2, 0,
        f"Calculation Version: {analytics.get('calculation_version', '1.0.0')}"
    )

    kpis = analytics.get("kpis", {})
    ws_summary.write(4, 0, "KPI", kpi_label_fmt)
    ws_summary.write(4, 1, "Value", kpi_label_fmt)
    ws_summary.write(4, 2, "Unit", kpi_label_fmt)

    rows_data = [
        ("Total Downtime", kpis.get("downtime_minutes", 0), "minutes"),
        ("Downtime Rate", kpis.get("downtime_rate_pct", 0), "%"),
        ("Availability", kpis.get("availability_pct", 0), "%"),
        ("Event Count", kpis.get("event_count", 0), "events"),
        ("Est. Units Lost", kpis.get("estimated_units_lost", 0), "units (est.)"),
    ]
    for i, (k, v, u) in enumerate(rows_data, start=5):
        ws_summary.write(i, 0, k)
        ws_summary.write(i, 1, v)
        ws_summary.write(i, 2, u)

    # Events sheet
    ws_events = workbook.add_worksheet("Downtime Events")
    headers = ["Machine", "Start Time", "End Time", "Duration (min)", "Reason", "Shift", "Source", "Notes"]
    for col, h in enumerate(headers):
        ws_events.write(0, col, h, header_fmt)

    for row_idx, e in enumerate(events, start=1):
        ws_events.write(row_idx, 0, machine_map.get(e.get("machine_id", ""), ""))
        ws_events.write(row_idx, 1, str(e.get("start_at", "")))
        ws_events.write(row_idx, 2, str(e.get("end_at", "")))
        ws_events.write(row_idx, 3, e.get("duration_min", 0))
        ws_events.write(row_idx, 4, reason_map.get(e.get("reason_id", ""), ""))
        ws_events.write(row_idx, 5, e.get("shift_id", ""))
        ws_events.write(row_idx, 6, e.get("source", ""))
        ws_events.write(row_idx, 7, e.get("notes", ""))

    # Pareto sheet
    ws_pareto = workbook.add_worksheet("Pareto Analysis")
    pareto_headers = ["Reason", "Total Minutes", "Events", "Share %", "Cumulative %"]
    for col, h in enumerate(pareto_headers):
        ws_pareto.write(0, col, h, header_fmt)

    for row_idx, item in enumerate(analytics.get("top_reasons", []), start=1):
        ws_pareto.write(row_idx, 0, item.get("reason_label", ""))
        ws_pareto.write(row_idx, 1, item.get("total_minutes", 0))
        ws_pareto.write(row_idx, 2, item.get("event_count", 0))
        ws_pareto.write(row_idx, 3, item.get("share_pct", 0))
        ws_pareto.write(row_idx, 4, item.get("cumulative_pct", 0))

    workbook.close()
    output.seek(0)
    return {
        "content": output.read(),
        "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "filename": f"factorypulse_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx",
    }


def _generate_pdf(analytics, title, plant_id, from_date, to_date) -> dict:
    """Generate PDF report content."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm

    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4)
    styles = getSampleStyleSheet()

    story = []
    title_style = ParagraphStyle(
        'Title',
        fontSize=18,
        spaceAfter=12,
        textColor=colors.HexColor('#22C3C9')
    )

    story.append(Paragraph(title, title_style))
    story.append(Paragraph(
        f"Plant: {plant_id} | Period: {from_date.date()} to {to_date.date()}",
        styles['Normal']
    ))
    story.append(Paragraph(
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | Version: {analytics.get('calculation_version', '1.0.0')}",
        styles['Normal']
    ))
    story.append(Spacer(1, 0.5 * cm))

    # KPI Table
    kpis = analytics.get("kpis", {})
    story.append(Paragraph("KPI Summary", styles['Heading2']))
    kpi_data = [
        ["Metric", "Value", "Unit"],
        ["Total Downtime", f"{kpis.get('downtime_minutes', 0):.1f}", "minutes"],
        ["Downtime Rate", f"{kpis.get('downtime_rate_pct', 0):.2f}", "%"],
        ["Availability", f"{kpis.get('availability_pct', 0):.2f}", "%"],
        ["Event Count", str(kpis.get("event_count", 0)), "events"],
        ["Est. Units Lost", f"{kpis.get('estimated_units_lost', 0):.1f}", "units (estimated)"],
    ]
    t = Table(kpi_data, colWidths=[8 * cm, 5 * cm, 5 * cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B1420')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#22C3C9')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.5 * cm))

    # Top Reasons
    story.append(Paragraph("Top Loss Reasons (Pareto)", styles['Heading2']))
    pareto_data = [["Reason", "Minutes", "Events", "Share %", "Cumulative %"]]
    for item in analytics.get("top_reasons", [])[:10]:
        pareto_data.append([
            item.get("reason_label", ""),
            f"{item.get('total_minutes', 0):.1f}",
            str(item.get("event_count", 0)),
            f"{item.get('share_pct', 0):.1f}",
            f"{item.get('cumulative_pct', 0):.1f}",
        ])
    t2 = Table(pareto_data, colWidths=[7 * cm, 3 * cm, 3 * cm, 3 * cm, 3 * cm])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B1420')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#22C3C9')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    story.append(t2)

    doc.build(story)
    output.seek(0)
    return {
        "content": output.read(),
        "content_type": "application/pdf",
        "filename": f"factorypulse_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf",
    }

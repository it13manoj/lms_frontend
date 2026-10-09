import React from 'react';

const formatDisplayDate = (dStr) => {
  if (!dStr) return '01 February 2026';
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dStr;
  }
};

export default function ExperienceCertificate({ data = {} }) {
  const candidateName = data.candidate_name || 'Mr. Alok Kumar';
  const position = data.position || 'UI Designer';
  const joiningDateFormatted = formatDisplayDate(data.joining_date || '2026-02-01');
  const endDateFormatted = formatDisplayDate(data.end_date || new Date().toISOString().slice(0, 10));
  const referenceNo = data.reference_no || 'PT/EXP/2026/001';
  const signatoryTitle = data.signatory_title || 'Parakshtech LLP';
  const signatoryName = data.signatory_name || 'Authorized Signatory';
  const customTerms = data.custom_terms;

  return (
    <div style={styles.outerWrapper}>
      <div style={styles.page}>
        <div style={styles.certificate}>

          {/* DECORATIVE CORNERS */}
          <div style={{ ...styles.corner, ...styles.topLeft }} />
          <div style={{ ...styles.corner, ...styles.topRight }} />
          <div style={{ ...styles.corner, ...styles.bottomLeft }} />
          <div style={{ ...styles.corner, ...styles.bottomRight }} />

          {/* COMPANY HEADER */}
          <div style={styles.header}>
            <div style={styles.brandRow}>
              {/* COMPANY LOGO */}
              <img
                src="/logo.jpeg"
                alt="Parakshtech LLP Logo"
                style={styles.logo}
                onError={(e) => { e.target.src = '/parakshtech_logo.jpg'; }}
              />

              {/* COMPANY NAME */}
              <div style={styles.brandText}>
                <h1 style={styles.companyName}>
                  PARAKSHTECH LLP
                </h1>
                <div style={styles.companySubtitle}>
                  CRAFTING POWERFUL WEB &amp; CLOUD SOLUTIONS
                </div>
              </div>
            </div>
            <div style={styles.headerLine} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#555', marginTop: '6px' }}>
            <span><strong>Ref:</strong> {referenceNo}</span>
            <span><strong>Date:</strong> {formatDisplayDate(data.issue_date || new Date().toISOString().slice(0, 10))}</span>
          </div>

          {/* TITLE */}
          <div style={styles.titleSection}>
            <h2 style={styles.title}>
              Experience Certificate
            </h2>
          </div>

          {/* MAIN CONTENT */}
          <div style={styles.content}>
            <p style={styles.paragraph}>
              This is to certify that{' '}
              <span style={styles.employeeName}>
                {candidateName}
              </span>{' '}
              worked with{' '}
              <strong>
                Parakshtech LLP
              </strong>{' '}
              as a{' '}
              <span style={styles.designation}>
                {position}
              </span>.
            </p>

            <p style={styles.paragraph}>
              During the tenure with the organization, they were
              responsible for designing, developing, and executing
              key software components, maintaining high technical standards,
              and collaborating proactively with cross-functional teams to
              deliver superior digital solutions.
            </p>

            <p style={styles.paragraph}>
              They demonstrated exceptional professionalism, dedication,
              technical prowess, and a collaborative team attitude throughout
              their employment with the organization.
            </p>
          </div>

          {/* EMPLOYMENT DETAILS */}
          <table style={styles.detailsTable}>
            <tbody>
              <tr>
                <td style={styles.detailsTd}>Employee Name</td>
                <td style={styles.detailsTd}><strong>{candidateName}</strong></td>
              </tr>
              <tr>
                <td style={styles.detailsTd}>Designation</td>
                <td style={styles.detailsTd}>{position}</td>
              </tr>
              <tr>
                <td style={styles.detailsTd}>Joining Date</td>
                <td style={styles.detailsTd}>{joiningDateFormatted}</td>
              </tr>
              <tr>
                <td style={styles.detailsTd}>Relieving Date</td>
                <td style={styles.detailsTd}>{endDateFormatted}</td>
              </tr>
              <tr>
                <td style={styles.detailsTd}>Organization</td>
                <td style={styles.detailsTd}>Parakshtech LLP</td>
              </tr>
            </tbody>
          </table>

          {/* CLOSING PARAGRAPH */}
          <div style={styles.closing}>
            {customTerms ? (
              <p style={styles.closingParagraph}>{customTerms}</p>
            ) : (
              <p style={styles.closingParagraph}>
                We appreciate their contributions to the organization
                and wish them all the very best for their future career
                and professional endeavors.
              </p>
            )}
            <p style={styles.closingParagraph}>
              This certificate is issued upon request for record and verification purposes.
            </p>
          </div>

          {/* AUTHORIZED SIGNATORY */}
          <div style={styles.signatureArea}>
            <div style={styles.signature}>
              <div style={{ height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src="/logo.jpeg"
                  alt="Seal"
                  style={{ height: '32px', opacity: 0.2 }}
                />
              </div>
              <div style={styles.signatureLine} />
              <div style={styles.authorized}>
                {signatoryName}
              </div>
              <div style={styles.companySmall}>
                {signatoryTitle}
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div style={styles.footer}>
            <strong>
              PARAKSHTECH LLP
            </strong>
            {' '}&nbsp;|&nbsp;{' '}
            Pushtakalya Road, Buxar, Bihar - 802101
            <br />
            Email:{' '}
            <strong>
              hr@parakshtech.com
            </strong>
            {' '}&nbsp;|&nbsp;{' '}
            Contact:{' '}
            <strong>
              9296454675
            </strong>
            {' '}&nbsp;|&nbsp;{' '}
            LLPIN:{' '}
            <strong>
              ACV5220
            </strong>
          </div>

        </div>
      </div>
    </div>
  );
}

// Inline Styles Object
const styles = {
  outerWrapper: {
    display: 'flex',
    justifyContent: 'center',
    background: '#f1f5f9',
    padding: '20px 0',
  },
  page: {
    width: '210mm',
    minHeight: '297mm',
    height: '297mm',
    background: '#ffffff',
    padding: '12mm',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    WebkitPrintColorAdjust: 'exact',
  },
  certificate: {
    border: '4px double #1f3a5f',
    height: '100%',
    padding: '28px 36px',
    position: 'relative',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  corner: {
    position: 'absolute',
    width: '28px',
    height: '28px',
    borderColor: '#c69214',
    borderStyle: 'solid',
  },
  topLeft: {
    top: '8px',
    left: '8px',
    borderWidth: '3px 0 0 3px',
  },
  topRight: {
    top: '8px',
    right: '8px',
    borderWidth: '3px 3px 0 0',
  },
  bottomLeft: {
    bottom: '8px',
    left: '8px',
    borderWidth: '0 0 3px 3px',
  },
  bottomRight: {
    bottom: '8px',
    right: '8px',
    borderWidth: '0 3px 3px 0',
  },
  header: {
    textAlign: 'center',
    marginBottom: '8px',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
  },
  logo: {
    width: '56px',
    height: '56px',
    objectFit: 'contain',
  },
  brandText: {
    textAlign: 'left',
  },
  companyName: {
    margin: 0,
    fontSize: '24px',
    letterSpacing: '2px',
    color: '#1f3a5f',
    fontFamily: 'Georgia, serif',
    fontWeight: 'bold',
  },
  companySubtitle: {
    fontSize: '9.5px',
    letterSpacing: '1.5px',
    color: '#666666',
    marginTop: '2px',
    fontWeight: 'bold',
  },
  headerLine: {
    height: '2px',
    background: 'linear-gradient(to right, transparent, #c69214, transparent)',
    marginTop: '10px',
  },
  titleSection: {
    textAlign: 'center',
    margin: '10px 0 14px 0',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    color: '#1f3a5f',
    fontFamily: 'Georgia, serif',
    display: 'inline-block',
    borderBottom: '2px solid #c69214',
    paddingBottom: '4px',
    fontWeight: 'bold',
  },
  content: {
    fontSize: '13px',
    lineHeight: '1.65',
    textAlign: 'justify',
  },
  paragraph: {
    margin: '0 0 8px 0',
  },
  employeeName: {
    fontWeight: 'bold',
    color: '#1f3a5f',
    fontSize: '14px',
  },
  designation: {
    fontWeight: 'bold',
    color: '#111827',
  },
  detailsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '10px 0',
    fontSize: '12.5px',
  },
  detailsTd: {
    border: '1px solid #d1d5db',
    padding: '7px 12px',
  },
  closing: {
    fontSize: '12.5px',
    lineHeight: '1.55',
  },
  closingParagraph: {
    margin: '0 0 6px 0',
  },
  signatureArea: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '10px',
    paddingRight: '15px',
  },
  signature: {
    textAlign: 'center',
    width: '180px',
  },
  signatureLine: {
    width: '100%',
    height: '1px',
    backgroundColor: '#111827',
    margin: '5px auto 4px auto',
  },
  authorized: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#1f3a5f',
  },
  companySmall: {
    fontSize: '10.5px',
    color: '#4b5563',
  },
  footer: {
    borderTop: '1px solid #d1d5db',
    paddingTop: '8px',
    textAlign: 'center',
    fontSize: '9.5px',
    color: '#4b5563',
    lineHeight: '1.5',
  },
};
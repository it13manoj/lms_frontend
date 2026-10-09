import React from 'react';

const formatDisplayDate = (dStr) => {
  if (!dStr) return 'February 01, 2026';
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
  } catch {
    return dStr;
  }
};

export default function OfferLetter({ data = {} }) {
  const candidateName = data.candidate_name || 'Mr. Alok Kumar';
  const position = data.position || 'UI Designer';
  const joiningDateFormatted = formatDisplayDate(data.joining_date || '2026-02-01');
  const issueDateFormatted = formatDisplayDate(data.issue_date || new Date().toISOString().slice(0, 10));
  const annualCtc = data.annual_ctc || '₹1.2 LPA';
  const workLocation = data.work_location || 'Buxar, Bihar (802101)';
  const candidateAddress = data.candidate_address || 'Buxar, Bihar, 802101';
  const referenceNo = data.reference_no || 'PT/OL/2026/001';
  const signatoryTitle = data.signatory_title || 'For ParakshTech LLP';
  const signatoryName = data.signatory_name || 'Authorized Signatory';
  const customTerms = data.custom_terms;

  return (
    <div className="printable-letter-container" style={styles.outerWrapper}>
      <div style={styles.letterPage}>
        <div style={styles.borderOuter}>
          <div style={styles.borderInner}>
            
            <div>
              {/* Header Table */}
              <table style={styles.headerTable}>
                <tbody>
                  <tr>
                    <td style={styles.logoCell}>
                      <img src="/logo.jpeg" alt="Logo" style={styles.logoImg} onError={(e) => { e.target.src = '/parakshtech_logo.jpg'; }} />
                    </td>
                    <td style={styles.companyCell}>
                      <div style={styles.companyName}>ParakshTech LLP</div>
                      <div style={styles.companyTagline}>Software & Technology Solutions</div>
                    </td>
                    <td style={styles.contactCell}>
                      Pushtakalya Road, Buxar, Bihar, 802101<br />
                      Email: hr@parakshtech.com | +91 9296454675
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Meta Info */}
              <div style={styles.letterMeta}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong>Date:</strong> {issueDateFormatted}<br />
                    <strong>Ref No:</strong> {referenceNo}
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <strong>To,</strong><br />
                  <strong>{candidateName}</strong><br />
                  {candidateAddress}
                </div>
              </div>

              {/* Title */}
              <div style={styles.letterTitle}>Offer & Joining Letter</div>

              {/* Body */}
              <div style={styles.contentBody}>
                <p>Dear <strong>{candidateName}</strong>,</p>
                <p>We are thrilled to formally offer you the position of <strong>{position}</strong> at <strong>ParakshTech LLP</strong>, located at Pushtakalya Road, Buxar, Bihar. Your employment commences effective <strong>{joiningDateFormatted}</strong>.</p>
                <p>In this role, you will be instrumental in delivering high-value technical and creative excellence across our web and mobile product platforms, maintaining superior code quality and collaborative teamwork.</p>
                
                <table style={styles.detailsTable}>
                  <tbody>
                    <tr>
                      <td style={styles.detailsTdLabel}>Position / Profile</td>
                      <td style={styles.detailsTdValue}>{position}</td>
                    </tr>
                    <tr>
                      <td style={styles.detailsTdLabel}>Joining Date</td>
                      <td style={styles.detailsTdValue}>{joiningDateFormatted}</td>
                    </tr>
                    <tr>
                      <td style={styles.detailsTdLabel}>Annual Compensation (CTC)</td>
                      <td style={styles.detailsTdValue}>{annualCtc}</td>
                    </tr>
                    <tr>
                      <td style={styles.detailsTdLabel}>Work Location</td>
                      <td style={styles.detailsTdValue}>{workLocation}</td>
                    </tr>
                  </tbody>
                </table>

                {customTerms ? (
                  <p>{customTerms}</p>
                ) : (
                  <p>Your compensation and benefits will be structured as per company policies. You will receive detailed guidelines regarding your roles, operational workflows, and professional conduct upon orientation.</p>
                )}
                <p>We are confident that your expertise will be a phenomenal addition to ParakshTech LLP. Please sign a copy of this letter as formal acceptance of our offer.</p>
              </div>
            </div>

            <div>
              {/* Signatures Table */}
              <table style={styles.sigTable}>
                <tbody>
                  <tr>
                    <td style={styles.sigTdLeft}>
                      <div style={styles.sigBox}>
                        <div style={styles.sigImgContainer}>
                          <img src="/logo.jpeg" alt="Seal" style={{ height: '35px', opacity: 0.15 }} />
                        </div>
                        <div style={styles.sigLine}>{signatoryName}</div>
                        <div style={styles.sigTitle}>{signatoryTitle}</div>
                      </div>
                    </td>
                    <td style={styles.sigTdRight}>
                      <div style={{ ...styles.sigBox, float: 'right' }}>
                        <div style={styles.sigImgContainer}></div>
                        <div style={styles.sigLine}>Accepted By</div>
                        <div style={styles.sigTitle}>{candidateName}</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Footer */}
              <div style={styles.footer}>
                ParakshTech LLP • Pushtakalya Road, Buxar, Bihar, 802101 • hr@parakshtech.com • +91 9296454675
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// Inline Styles Object matching A4 Portrait specifications
const styles = {
  outerWrapper: {
    display: 'flex',
    justifyContent: 'center',
    background: '#f1f5f9',
    padding: '20px 0',
  },
  letterPage: {
    width: '210mm',
    minHeight: '297mm',
    height: '297mm',
    padding: '12mm 15mm',
    boxSizing: 'border-box',
    background: '#ffffff',
    position: 'relative',
    fontFamily: "'Times New Roman', Times, serif",
    color: '#2c3e50',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    WebkitPrintColorAdjust: 'exact',
  },
  borderOuter: {
    width: '100%',
    height: '100%',
    border: '2px solid #7a0000',
    padding: '4mm',
    boxSizing: 'border-box',
    background: '#ffffff',
  },
  borderInner: {
    width: '100%',
    height: '100%',
    border: '1px solid #c5a059',
    padding: '8mm 12mm',
    boxSizing: 'border-box',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  headerTable: {
    width: '100%',
    borderCollapse: 'collapse',
    borderBottom: '2px solid #7a0000',
    paddingBottom: '10px',
    marginBottom: '12px',
  },
  logoCell: {
    width: '60px',
    verticalAlign: 'middle',
    padding: 0,
  },
  logoImg: {
    width: '55px',
    height: '48px',
    objectFit: 'contain',
    display: 'block',
  },
  companyCell: {
    paddingLeft: '12px',
    verticalAlign: 'middle',
  },
  companyName: {
    fontSize: '22px',
    color: '#7a0000',
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: 0,
  },
  companyTagline: {
    fontSize: '10px',
    color: '#666',
    fontFamily: 'Arial, sans-serif',
    marginTop: '2px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  contactCell: {
    textAlign: 'right',
    fontSize: '10px',
    color: '#555',
    fontFamily: 'Arial, sans-serif',
    lineHeight: 1.4,
    verticalAlign: 'middle',
  },
  letterMeta: {
    marginBottom: '12px',
    fontSize: '13px',
    fontFamily: 'Arial, sans-serif',
    lineHeight: 1.5,
  },
  letterTitle: {
    textAlign: 'center',
    fontSize: '20px',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    color: '#7a0000',
    borderBottom: '1px solid #c5a059',
    display: 'inline-block',
    width: '100%',
    paddingBottom: '5px',
    marginBottom: '14px',
    fontWeight: 'bold',
    fontFamily: 'Arial, sans-serif',
  },
  contentBody: {
    fontSize: '13.5px',
    lineHeight: 1.6,
    textAlign: 'justify',
  },
  detailsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '12px 0',
    border: '1px solid #e0e0e0',
    fontFamily: 'Arial, sans-serif',
    fontSize: '12.5px',
  },
  detailsTdLabel: {
    padding: '8px 12px',
    fontWeight: 'bold',
    backgroundColor: '#fafafa',
    width: '38%',
    borderBottom: '1px solid #e0e0e0',
    borderRight: '1px solid #e0e0e0',
  },
  detailsTdValue: {
    padding: '8px 12px',
    borderBottom: '1px solid #e0e0e0',
  },
  sigTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  },
  sigTdLeft: {
    width: '50%',
    verticalAlign: 'bottom',
    padding: 0,
  },
  sigTdRight: {
    width: '50%',
    verticalAlign: 'bottom',
    padding: 0,
    textAlign: 'right',
  },
  sigBox: {
    display: 'inline-block',
    textAlign: 'center',
    width: '200px',
  },
  sigImgContainer: {
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigLine: {
    borderTop: '1px solid #2c3e50',
    paddingTop: '5px',
    fontWeight: 'bold',
    fontSize: '12.5px',
    fontFamily: 'Arial, sans-serif',
  },
  sigTitle: {
    fontSize: '11px',
    color: '#555',
    fontFamily: 'Arial, sans-serif',
  },
  footer: {
    textAlign: 'center',
    fontSize: '9.5px',
    color: '#777',
    borderTop: '1px solid #c5a059',
    paddingTop: '6px',
    marginTop: '15px',
    fontFamily: 'Arial, sans-serif',
  },
};
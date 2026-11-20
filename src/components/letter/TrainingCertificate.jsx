import React from 'react';
import companyLogo from '../../assets/parakshtech_logo.jpg';
import signatureImg from '../../assets/signature.png';
import stampImg from '../../assets/stamp.png';

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

export default function TrainingCertificate({ data = {} }) {
  const candidateName = data.candidate_name || 'Candidate Name';
  const courseTitle = data.position || 'Full Stack Web Development';
  const department = data.department || 'Technology & Engineering';
  const startDateFormatted = formatDisplayDate(data.joining_date || '2026-01-01');
  const endDateFormatted = formatDisplayDate(data.end_date || new Date().toISOString().slice(0, 10));
  const issueDateFormatted = formatDisplayDate(data.issue_date || new Date().toISOString().slice(0, 10));
  const referenceNo = data.reference_no || 'PT/TC/2026/001';
  const signatoryTitle = data.signatory_title || 'For ParakshTech LLP';
  const signatoryName = data.signatory_name || 'Authorized Signatory';
  const customTerms = data.custom_terms || '';
  const hasSignature = Boolean(data.include_signature);
  const hasStamp = Boolean(data.include_stamp);

  return (
    <div className="printable-letter-container" style={styles.outerWrapper}>
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
              <img
                src={companyLogo}
                alt="Parakshtech LLP Logo"
                style={styles.logo}
                onError={(e) => { e.target.src = '/logo.jpeg'; }}
              />
              <div style={styles.brandText}>
                <h1 style={styles.companyName}>PARAKSHTECH LLP</h1>
                <div style={styles.companySubtitle}>
                  CENTRE FOR SOFTWARE ENGINEERING, INNOVATION &amp; CLOUD ARCHITECTURE
                </div>
              </div>
            </div>
            <div style={styles.headerLine} />
          </div>

          {/* REFERENCE & ISSUE DATE */}
          <div style={styles.metaRow}>
            <span><strong>Certificate Ref No:</strong> {referenceNo}</span>
            <span><strong>Date of Issuance:</strong> {issueDateFormatted}</span>
          </div>

          {/* CERTIFICATE TITLE */}
          <div style={styles.titleSection}>
            <div style={styles.preTitle}>OFFICIAL CERTIFICATION OF ACCOMPLISHMENT</div>
            <h2 style={styles.title}>CERTIFICATE OF TRAINING COMPLETION</h2>
            <div style={styles.titleUnderline} />
          </div>

          {/* MAIN CITATION & CONTENT */}
          <div style={styles.content}>
            <p style={styles.leadParagraph}>
              This is to proudly certify that
            </p>

            <div style={styles.recipientNameWrapper}>
              <h2 style={styles.recipientName}>{candidateName}</h2>
              <div style={styles.recipientSubline}>
                has successfully completed the comprehensive industrial training program
              </div>
            </div>

            <div style={styles.courseBadgeWrapper}>
              <div style={styles.courseBadge}>
                <span style={styles.courseLabel}>Specialization / Course:</span>
                <span style={styles.courseName}>{courseTitle}</span>
              </div>
            </div>

            <p style={styles.durationParagraph}>
              conducted within the <strong>{department}</strong> division from{' '}
              <strong>{startDateFormatted}</strong> to <strong>{endDateFormatted}</strong>.
            </p>

            {/* CUSTOMIZABLE BODY PARAGRAPHS */}
            {data.body_content && data.body_content.trim() ? (
              data.body_content.split(/\n\s*\n/).filter(p => p.trim()).map((para, idx) => (
                <p key={idx} style={styles.paragraph}>
                  {para.trim()}
                </p>
              ))
            ) : (
              <>
                <p style={styles.paragraph}>
                  During the course of the training, they were actively involved in practical project implementations, system design workflows, and modern software development practices. They demonstrated remarkable analytical thinking, technical discipline, problem-solving prowess, and collaborative team spirit.
                </p>
                <p style={styles.paragraph}>
                  All milestones and performance assessments were evaluated with outstanding commitment. We commend their dedication and wish them monumental success in their future engineering and professional endeavors.
                </p>
              </>
            )}

            {/* PERFORMANCE / GRADE / REMARKS IF CUSTOM TERMS SET */}
            {customTerms && customTerms.trim() && (
              <div style={styles.remarksBox}>
                <strong>Evaluation / Remarks:</strong> {customTerms}
              </div>
            )}
          </div>

          {/* SIGNATURE & VERIFICATION FOOTER */}
          <div style={styles.footer}>
            <div style={styles.leftCol}>
              <div style={styles.verificationBadge}>
                <span style={styles.badgeIcon}>★</span>
                <span style={styles.badgeTextCol}>
                  <strong style={styles.badgeTitle}>Verified Industrial Training</strong>
                  <span style={styles.badgeSubtitle}>ParakshTech LLP HR &amp; Academics</span>
                </span>
              </div>
              <div style={styles.verificationNote}>
                Authenticity may be confirmed via LMS Portal. Ref: {referenceNo}
              </div>
            </div>

            {/* OFFICIAL STAMP (CENTER) */}
            <div style={styles.centerCol}>
              {hasStamp && (
                <div style={styles.stampWrapper}>
                  <img
                    src={stampImg}
                    alt="Parakshtech LLP Official Stamp"
                    style={styles.stamp}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div style={styles.stampText}>Official Company Seal</div>
                </div>
              )}
            </div>

            {/* AUTHORIZED SIGNATORY (RIGHT) */}
            <div style={styles.rightCol}>
              <div style={styles.signatureBox}>
                {hasSignature ? (
                  <img
                    src={signatureImg}
                    alt="Authorized Signatory"
                    style={styles.signature}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div style={styles.signatureSpace} />
                )}
                <div style={styles.signatoryLine} />
                <div style={styles.signatoryName}>{signatoryName}</div>
                <div style={styles.signatoryTitle}>{signatoryTitle}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const styles = {
  outerWrapper: {
    display: 'flex',
    justifyContent: 'center',
    background: '#f4f6f9',
    padding: '20px 0',
    fontFamily: '"Times New Roman", Times, "Georgia", serif',
    color: '#1a202c'
  },
  page: {
    width: '210mm',
    minHeight: '297mm',
    background: '#ffffff',
    padding: '16mm 18mm 18mm 18mm',
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    boxSizing: 'border-box',
    position: 'relative'
  },
  certificate: {
    border: '4px double #1a365d',
    padding: '24px 30px',
    minHeight: '260mm',
    boxSizing: 'border-box',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    background: '#fafcff'
  },
  corner: {
    position: 'absolute',
    width: '26px',
    height: '26px',
    borderColor: '#c69214',
    borderStyle: 'solid'
  },
  topLeft: { top: '8px', left: '8px', borderTopWidth: '3px', borderLeftWidth: '3px', borderBottomWidth: 0, borderRightWidth: 0 },
  topRight: { top: '8px', right: '8px', borderTopWidth: '3px', borderRightWidth: '3px', borderBottomWidth: 0, borderLeftWidth: 0 },
  bottomLeft: { bottom: '8px', left: '8px', borderBottomWidth: '3px', borderLeftWidth: '3px', borderTopWidth: 0, borderRightWidth: 0 },
  bottomRight: { bottom: '8px', right: '8px', borderBottomWidth: '3px', borderRightWidth: '3px', borderTopWidth: 0, borderLeftWidth: 0 },

  header: {
    marginBottom: '10px'
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    justifyContent: 'center',
    marginBottom: '8px'
  },
  logo: {
    width: '68px',
    height: '68px',
    objectFit: 'contain',
    marginRight: '16px'
  },
  brandText: {
    textAlign: 'left'
  },
  companyName: {
    fontSize: '26px',
    fontWeight: '900',
    letterSpacing: '2px',
    color: '#0f2942',
    margin: 0,
    textTransform: 'uppercase'
  },
  companySubtitle: {
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '1.2px',
    color: '#c69214',
    textTransform: 'uppercase',
    marginTop: '2px'
  },
  headerLine: {
    height: '2px',
    background: 'linear-gradient(to right, #1a365d, #c69214, #1a365d)',
    marginTop: '6px'
  },

  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#4a5568',
    marginTop: '6px',
    paddingBottom: '8px',
    borderBottom: '1px dashed #cbd5e1'
  },

  titleSection: {
    textAlign: 'center',
    marginTop: '16px',
    marginBottom: '16px'
  },
  preTitle: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '2.5px',
    color: '#718096',
    textTransform: 'uppercase',
    marginBottom: '4px'
  },
  title: {
    fontSize: '26px',
    fontWeight: '800',
    letterSpacing: '2px',
    color: '#1a365d',
    textTransform: 'uppercase',
    margin: '4px 0'
  },
  titleUnderline: {
    width: '120px',
    height: '3px',
    background: '#c69214',
    margin: '6px auto 0 auto',
    borderRadius: '2px'
  },

  content: {
    flexGrow: 1,
    marginTop: '10px'
  },
  leadParagraph: {
    textAlign: 'center',
    fontSize: '14px',
    fontStyle: 'italic',
    color: '#4a5568',
    margin: '0 0 10px 0'
  },
  recipientNameWrapper: {
    textAlign: 'center',
    padding: '8px 0',
    marginBottom: '12px'
  },
  recipientName: {
    fontSize: '30px',
    fontWeight: '800',
    color: '#0f2942',
    margin: '0 0 4px 0',
    letterSpacing: '1px',
    textDecoration: 'underline',
    textUnderlineOffset: '6px',
    textDecorationColor: '#c69214'
  },
  recipientSubline: {
    fontSize: '13px',
    color: '#4a5568',
    fontStyle: 'italic'
  },

  courseBadgeWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '14px'
  },
  courseBadge: {
    display: 'inline-block',
    background: '#edf2f7',
    border: '1px solid #cbd5e1',
    borderRadius: '40px',
    padding: '6px 22px',
    textAlign: 'center'
  },
  courseLabel: {
    fontSize: '12px',
    color: '#4a5568',
    fontWeight: '600',
    marginRight: '8px',
    display: 'inline-block'
  },
  courseName: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#1a365d',
    letterSpacing: '0.5px',
    display: 'inline-block'
  },

  durationParagraph: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#2d3748',
    marginBottom: '16px'
  },
  paragraph: {
    fontSize: '13.5px',
    lineHeight: '1.75',
    textAlign: 'justify',
    marginBottom: '12px',
    color: '#2d3748'
  },
  remarksBox: {
    fontSize: '12.5px',
    background: '#f7fafc',
    borderLeft: '4px solid #c69214',
    padding: '8px 14px',
    marginTop: '12px',
    color: '#2d3748'
  },

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0'
  },
  leftCol: {
    flex: 1,
    textAlign: 'left'
  },
  verificationBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    background: '#ebf8ff',
    border: '1px solid #bee3f8',
    borderRadius: '6px',
    textAlign: 'left',
    whiteSpace: 'nowrap'
  },
  badgeIcon: {
    fontSize: '22px',
    color: '#2b6cb0',
    display: 'inline-block',
    verticalAlign: 'middle',
    lineHeight: 1,
    marginRight: '8px'
  },
  badgeTextCol: {
    display: 'inline-block',
    verticalAlign: 'middle',
    textAlign: 'left'
  },
  badgeTitle: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#2b6cb0',
    lineHeight: '14px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  badgeSubtitle: {
    display: 'block',
    fontSize: '10px',
    fontWeight: 'normal',
    color: '#4a5568',
    lineHeight: '13px',
    marginTop: '2px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  verificationNote: {
    fontSize: '9px',
    color: '#718096',
    marginTop: '6px'
  },

  centerCol: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  stampWrapper: {
    textAlign: 'center'
  },
  stamp: {
    width: '80px',
    height: '80px',
    objectFit: 'contain'
  },
  stampText: {
    fontSize: '9px',
    color: '#718096',
    marginTop: '2px',
    letterSpacing: '0.5px'
  },

  rightCol: {
    flex: 1,
    textAlign: 'right'
  },
  signatureBox: {
    display: 'inline-block',
    textAlign: 'center',
    minWidth: '180px'
  },
  signature: {
    height: '50px',
    maxWidth: '150px',
    objectFit: 'contain',
    marginBottom: '2px'
  },
  signatureSpace: {
    height: '50px'
  },
  signatoryLine: {
    width: '100%',
    height: '1px',
    background: '#2d3748',
    marginBottom: '4px'
  },
  signatoryName: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1a202c'
  },
  signatoryTitle: {
    fontSize: '11px',
    color: '#718096'
  }
};

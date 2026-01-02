// CipherX Solutions - Smart Document Template Engine
// Pre-written, MSP-grade templates for all service types

import { Database } from '@/integrations/supabase/types';

type DocumentType = Database['public']['Enums']['document_type'];
type ServiceType = Database['public']['Enums']['service_type'];

export interface TemplateSection {
  key: string;
  title: string;
  content: string;
  isLocked: boolean;
  isRequired: boolean;
  sortOrder: number;
}

export interface PricingItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}

export interface ServiceTemplate {
  documentType: DocumentType;
  serviceType: ServiceType;
  templateName: string;
  sections: TemplateSection[];
  defaultPricing: PricingItem[];
  complianceText: {
    phipa: string;
    pipeda: string;
    cybersecurity?: string;
    dataHandling: string;
  };
  pricingModel: 'fixed' | 'monthly' | 'hourly' | 'package';
}

// Service Type Labels
export const serviceTypeLabels: Record<ServiceType, string> = {
  website_pwa_build: 'Website + PWA Application Build',
  website_only: 'Website Only',
  pwa_only: 'PWA App Only',
  cybersecurity: 'Cybersecurity Services',
  graphic_design: 'Graphic Design, Photo & Videography',
};

export const documentTypeLabels: Record<DocumentType, string> = {
  proposal: 'Proposal',
  contract: 'Service Contract',
  sla: 'Service Level Agreement',
};

// Compliance Text Templates
const complianceTexts = {
  phipa: `This Agreement acknowledges that CipherX Solutions Inc. may handle Personal Health Information (PHI) as defined under the Personal Health Information Protection Act, 2004 (PHIPA). CipherX Solutions agrees to:
  
• Implement appropriate administrative, technical, and physical safeguards to protect PHI
• Use and disclose PHI only as permitted or required by law
• Report any suspected or actual breach of PHI security within 24 hours
• Ensure all employees and subcontractors are trained on PHIPA requirements
• Maintain audit logs of all PHI access and modifications`,

  pipeda: `CipherX Solutions Inc. complies with the Personal Information Protection and Electronic Documents Act (PIPEDA) and commits to:

• Obtaining consent before collecting, using, or disclosing personal information
• Limiting collection to information necessary for identified purposes
• Using and retaining personal information only for specified purposes
• Maintaining accurate, complete, and up-to-date personal information
• Implementing appropriate security safeguards
• Providing individuals access to their personal information upon request`,

  cybersecurity: `CipherX Solutions adheres to industry-recognized cybersecurity frameworks including:

• NIST Cybersecurity Framework (CSF)
• ISO 27001 Information Security Management
• OWASP Application Security Standards
• CIS Critical Security Controls

All security measures are regularly reviewed and updated to address emerging threats.`,

  dataHandling: `All data processed under this Agreement shall be:

• Encrypted in transit using TLS 1.3 or higher
• Encrypted at rest using AES-256 encryption
• Stored in Canadian data centers unless otherwise agreed
• Backed up daily with 30-day retention
• Permanently deleted upon contract termination or earlier upon request`,
};

// Governing Law Section (Locked)
const governingLawSection: TemplateSection = {
  key: 'governing_law',
  title: 'Governing Law',
  content: `This Agreement shall be governed by and construed in accordance with the laws of the Province of Ontario and the federal laws of Canada applicable therein. The parties hereby irrevocably submit to the exclusive jurisdiction of the courts of Ontario for any disputes arising from or related to this Agreement.

Any legal action or proceeding arising under this Agreement shall be brought exclusively in the courts located in Ottawa, Ontario, and the parties hereby irrevocably consent to the personal jurisdiction and venue therein.`,
  isLocked: true,
  isRequired: true,
  sortOrder: 99,
};

// Confidentiality Section (Locked)
const confidentialitySection: TemplateSection = {
  key: 'confidentiality',
  title: 'Confidentiality',
  content: `Both parties agree to maintain strict confidentiality regarding all proprietary information, trade secrets, and confidential business information disclosed during the course of this Agreement.

"Confidential Information" includes, but is not limited to:
• Technical data, source code, and system architecture
• Business strategies, financial information, and pricing
• Customer lists, vendor relationships, and internal processes
• Any information marked as "Confidential" or that should reasonably be understood to be confidential

This obligation survives termination of this Agreement for a period of five (5) years.`,
  isLocked: true,
  isRequired: true,
  sortOrder: 6,
};

// Liability Section (Locked)
const liabilitySection: TemplateSection = {
  key: 'liability',
  title: 'Limitation of Liability',
  content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:

1. CIPHERX SOLUTIONS' TOTAL LIABILITY UNDER THIS AGREEMENT SHALL NOT EXCEED THE TOTAL FEES PAID BY CLIENT IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.

2. IN NO EVENT SHALL CIPHERX SOLUTIONS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, BUSINESS OPPORTUNITIES, OR GOODWILL.

3. THE FOREGOING LIMITATIONS SHALL APPLY REGARDLESS OF THE FORM OF ACTION, WHETHER IN CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR OTHERWISE.

4. THESE LIMITATIONS SHALL NOT APPLY TO:
   • Breaches of confidentiality obligations
   • Gross negligence or willful misconduct
   • Indemnification obligations
   • Liability that cannot be limited by law`,
  isLocked: true,
  isRequired: true,
  sortOrder: 7,
};

// Indemnification Section (Locked)
const indemnificationSection: TemplateSection = {
  key: 'indemnification',
  title: 'Indemnification',
  content: `Each party agrees to indemnify, defend, and hold harmless the other party, its officers, directors, employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from:

1. The indemnifying party's breach of this Agreement
2. The indemnifying party's negligence or willful misconduct
3. Any violation of applicable laws or regulations by the indemnifying party
4. Any third-party claims resulting from the indemnifying party's actions

Client specifically agrees to indemnify CipherX Solutions against any claims arising from:
• Client's content, data, or materials provided to CipherX Solutions
• Client's use of deliverables in violation of any law or third-party rights
• Client's failure to obtain necessary consents or licenses`,
  isLocked: true,
  isRequired: true,
  sortOrder: 8,
};

// Data Protection Section (Locked)
const dataProtectionSection: TemplateSection = {
  key: 'data_protection',
  title: 'Data Protection & Privacy',
  content: `${complianceTexts.pipeda}

${complianceTexts.phipa}

${complianceTexts.dataHandling}`,
  isLocked: true,
  isRequired: true,
  sortOrder: 5,
};

// ============================================
// WEBSITE + PWA BUILD TEMPLATES
// ============================================

const websitePwaProposal: ServiceTemplate = {
  documentType: 'proposal',
  serviceType: 'website_pwa_build',
  templateName: 'Website + PWA Application Proposal',
  pricingModel: 'fixed',
  complianceText: complianceTexts,
  defaultPricing: [
    { id: '1', description: 'Discovery & Planning', quantity: 1, unitPrice: 2500, unit: 'fixed' },
    { id: '2', description: 'UI/UX Design', quantity: 1, unitPrice: 4000, unit: 'fixed' },
    { id: '3', description: 'Website Development', quantity: 1, unitPrice: 6000, unit: 'fixed' },
    { id: '4', description: 'PWA Development', quantity: 1, unitPrice: 5000, unit: 'fixed' },
    { id: '5', description: 'Testing & QA', quantity: 1, unitPrice: 1500, unit: 'fixed' },
    { id: '6', description: 'Launch & Deployment', quantity: 1, unitPrice: 1000, unit: 'fixed' },
    { id: '7', description: 'Monthly Hosting (Annual)', quantity: 12, unitPrice: 99, unit: 'month' },
  ],
  sections: [
    {
      key: 'cover',
      title: 'Cover Page',
      content: `PROPOSAL

Website + Progressive Web Application Development

Prepared for: {{CLIENT_NAME}}
Prepared by: CipherX Solutions Inc.
Date: {{DATE}}
Valid Until: {{EXPIRY_DATE}}

CipherX Solutions Inc.
Ottawa, Ontario, Canada
www.cipherxsolutions.com`,
      isLocked: false,
      isRequired: true,
      sortOrder: 0,
    },
    {
      key: 'executive_summary',
      title: 'Executive Summary',
      content: `CipherX Solutions will design, develop, and deploy a modern, secure, and scalable Website and Progressive Web Application (PWA) to support {{CLIENT_NAME}}'s business growth, customer engagement, and digital operations.

Our solution will deliver:
• A responsive, mobile-first website that represents your brand professionally
• A Progressive Web App that works offline and feels like a native mobile application
• Secure, Canadian-hosted infrastructure compliant with privacy regulations
• A complete admin dashboard for content and business management

This proposal outlines our recommended approach, deliverables, timeline, and investment required to bring your digital vision to life.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 1,
    },
    {
      key: 'scope',
      title: 'Scope of Work',
      content: `CipherX Solutions will provide the following services:

**Phase 1: Discovery & Planning (Week 1-2)**
• Requirements gathering and stakeholder interviews
• Competitor and market analysis
• Technical architecture planning
• Project roadmap development

**Phase 2: Design (Week 3-5)**
• Brand alignment and style guide creation
• Wireframe development for all key pages
• High-fidelity mockups with client approval rounds
• Mobile-first responsive design implementation

**Phase 3: Development (Week 6-10)**
• Front-end website development (React/Next.js)
• PWA development with offline capabilities
• Admin dashboard development
• Integration of booking, forms, or custom functionality
• API development and third-party integrations

**Phase 4: Testing & Launch (Week 11-12)**
• Cross-browser and device testing
• Performance optimization
• Security hardening and penetration testing
• Deployment to production environment
• Training and documentation delivery`,
      isLocked: false,
      isRequired: true,
      sortOrder: 2,
    },
    {
      key: 'deliverables',
      title: 'Deliverables',
      content: `Upon project completion, {{CLIENT_NAME}} will receive:

**Website Deliverables:**
• Fully responsive website (desktop, tablet, mobile)
• Content management system (CMS) for easy updates
• Contact forms with email notifications
• SEO optimization and analytics integration
• SSL certificate and security hardening

**PWA Deliverables:**
• Progressive Web App installable on mobile devices
• Offline functionality for core features
• Push notification capability
• App-like navigation and performance

**Admin & Infrastructure:**
• Custom admin dashboard for business management
• Secure hosting on Canadian servers
• Automated daily backups
• Performance monitoring and uptime tracking

**Documentation & Training:**
• User manual for content management
• Technical documentation for future development
• 2-hour training session for your team`,
      isLocked: false,
      isRequired: true,
      sortOrder: 3,
    },
    {
      key: 'timeline',
      title: 'Project Timeline',
      content: `**Estimated Project Duration:** 12 Weeks

| Phase | Duration | Milestones |
|-------|----------|------------|
| Discovery & Planning | Week 1-2 | Requirements approved, architecture finalized |
| Design | Week 3-5 | Wireframes approved, final designs approved |
| Development | Week 6-10 | Website complete, PWA complete, integrations complete |
| Testing & Launch | Week 11-12 | QA complete, training delivered, go-live |

**Key Assumptions:**
• Client provides content (text, images, branding) by Week 3
• Client feedback provided within 3 business days of deliverables
• Any scope changes will be documented and may affect timeline`,
      isLocked: false,
      isRequired: true,
      sortOrder: 4,
    },
    {
      key: 'pricing',
      title: 'Investment',
      content: `{{PRICING_TABLE}}

**Payment Terms:**
• 40% deposit upon agreement signing
• 30% upon design approval
• 30% upon project completion

**What's Included:**
• All development and design work
• 12 months of hosting included
• 30 days of post-launch support
• All source code and assets ownership

**Optional Add-ons:**
• Extended support package: $500/month
• Additional features: Quoted separately
• Content creation services: Quoted separately`,
      isLocked: false,
      isRequired: true,
      sortOrder: 5,
    },
    {
      key: 'terms',
      title: 'Terms & Conditions',
      content: `**Proposal Validity:** This proposal is valid for 30 days from the date above.

**Ownership:** Upon final payment, {{CLIENT_NAME}} will own all rights to the delivered website, PWA, and related assets. CipherX Solutions retains rights to underlying frameworks and reusable components.

**Confidentiality:** Both parties agree to keep project details confidential.

**Change Requests:** Any changes to scope will be documented in a Change Order and may affect timeline and cost.

**Cancellation:** Client may cancel with 14 days written notice. Payment required for work completed.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 6,
    },
    {
      key: 'acceptance',
      title: 'Acceptance',
      content: `To proceed with this proposal, please sign below and return with the initial deposit.

By signing, {{CLIENT_NAME}} agrees to the scope, timeline, and investment outlined in this proposal.

{{SIGNATURE_BLOCK}}`,
      isLocked: false,
      isRequired: true,
      sortOrder: 7,
    },
  ],
};

const websitePwaContract: ServiceTemplate = {
  documentType: 'contract',
  serviceType: 'website_pwa_build',
  templateName: 'Website + PWA Application Service Contract',
  pricingModel: 'fixed',
  complianceText: complianceTexts,
  defaultPricing: websitePwaProposal.defaultPricing,
  sections: [
    {
      key: 'parties',
      title: 'Parties',
      content: `This Service Contract ("Agreement") is entered into as of {{DATE}} ("Effective Date") by and between:

**CipherX Solutions Inc.** ("Provider")
A corporation incorporated under the laws of Ontario, Canada
Principal Place of Business: Ottawa, Ontario

AND

**{{CLIENT_NAME}}** ("Client")
{{CLIENT_ADDRESS}}

Collectively referred to as the "Parties" and individually as a "Party."`,
      isLocked: false,
      isRequired: true,
      sortOrder: 0,
    },
    {
      key: 'definitions',
      title: 'Definitions',
      content: `For the purposes of this Agreement:

**"Deliverables"** means the website, PWA, documentation, and all other materials produced under this Agreement.

**"Project"** means the complete scope of work described in the Scope of Services section.

**"Confidential Information"** means any non-public information disclosed by either party.

**"Intellectual Property"** means all patents, copyrights, trademarks, trade secrets, and other proprietary rights.

**"Change Order"** means a written document signed by both parties modifying the original scope.

**"Force Majeure"** means events beyond reasonable control including natural disasters, war, government actions, or system failures.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 1,
    },
    {
      key: 'scope',
      title: 'Scope of Services',
      content: `Provider agrees to deliver the following services to Client:

**Website Development Services:**
• Custom responsive website design and development
• Content management system implementation
• Search engine optimization (SEO) foundation
• Contact forms and lead capture functionality
• Analytics and tracking integration

**Progressive Web Application (PWA) Services:**
• PWA development with offline capabilities
• Push notification implementation
• Mobile-first responsive interface
• App-like navigation and performance optimization

**Supporting Services:**
• Project management and status reporting
• Quality assurance and testing
• Deployment and launch support
• Post-launch training and documentation

**Hosting Services (12 months included):**
• Secure Canadian cloud hosting
• SSL certificate provision and renewal
• Daily automated backups
• 99.9% uptime guarantee
• Technical support during business hours`,
      isLocked: false,
      isRequired: true,
      sortOrder: 2,
    },
    {
      key: 'payment',
      title: 'Payment Terms',
      content: `{{PRICING_TABLE}}

**Payment Schedule:**
• 40% due upon contract execution
• 30% due upon design approval milestone
• 30% due upon project completion and acceptance

**Payment Methods:**
Payments may be made via bank transfer, credit card, or cheque payable to CipherX Solutions Inc.

**Late Payments:**
Payments not received within 15 days of invoice date will incur a 1.5% monthly interest charge. Provider reserves the right to suspend work on overdue accounts.

**Taxes:**
All amounts are in Canadian Dollars (CAD) and exclusive of applicable taxes (HST/GST). Client is responsible for all applicable taxes.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 3,
    },
    {
      key: 'ip_ownership',
      title: 'Intellectual Property & Ownership',
      content: `**Client Ownership:**
Upon full payment, Client shall own:
• All custom design work and graphics created specifically for this project
• All custom code developed specifically for this project
• All content, copy, and media provided by or created for Client
• Domain names registered for Client

**Provider Retention:**
Provider retains ownership of:
• Pre-existing code, frameworks, and libraries used in development
• Generic, reusable components and modules
• Development tools, methodologies, and processes

**License Grant:**
Provider grants Client a perpetual, non-exclusive license to use any Provider-retained materials as part of the delivered Deliverables.

**Third-Party Materials:**
Any third-party software or materials included in Deliverables will be subject to their respective licenses, which Provider will disclose to Client.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 4,
    },
    confidentialitySection,
    dataProtectionSection,
    liabilitySection,
    indemnificationSection,
    {
      key: 'warranty',
      title: 'Warranty',
      content: `Provider warrants that:

**Workmanship Warranty (90 Days):**
• Deliverables will function substantially as specified for 90 days following launch
• Provider will correct any defects at no additional cost during this period
• This warranty covers bugs, errors, and functional issues only

**Exclusions:**
This warranty does not cover:
• Issues caused by Client modifications
• Problems arising from third-party integrations not implemented by Provider
• Issues caused by Client's hosting environment (if not provided by Provider)
• Browser or platform changes after delivery

**Hosting Warranty:**
For the 12-month hosting period, Provider warrants 99.9% uptime availability, excluding scheduled maintenance windows.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 10,
    },
    {
      key: 'termination',
      title: 'Termination',
      content: `**Termination for Convenience:**
Either party may terminate this Agreement with 30 days written notice. Client shall pay for all work completed through the termination date.

**Termination for Cause:**
Either party may terminate immediately upon written notice if the other party:
• Materially breaches this Agreement and fails to cure within 14 days of notice
• Becomes insolvent or files for bankruptcy
• Fails to make payment within 30 days of due date

**Effect of Termination:**
Upon termination:
• Provider will deliver all work completed to date
• Client shall pay all amounts owed for completed work
• Confidentiality obligations survive termination
• Provider will return or destroy Client's confidential information`,
      isLocked: false,
      isRequired: true,
      sortOrder: 11,
    },
    governingLawSection,
    {
      key: 'signatures',
      title: 'Signatures',
      content: `IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.

{{SIGNATURE_BLOCK}}`,
      isLocked: false,
      isRequired: true,
      sortOrder: 100,
    },
  ],
};

const websitePwaSLA: ServiceTemplate = {
  documentType: 'sla',
  serviceType: 'website_pwa_build',
  templateName: 'Website + PWA Hosting Service Level Agreement',
  pricingModel: 'monthly',
  complianceText: complianceTexts,
  defaultPricing: [
    { id: '1', description: 'Monthly Hosting & Support', quantity: 1, unitPrice: 99, unit: 'month' },
  ],
  sections: [
    {
      key: 'service_scope',
      title: 'Service Scope',
      content: `This Service Level Agreement ("SLA") defines the service levels for hosting and support services provided by CipherX Solutions Inc. ("Provider") to {{CLIENT_NAME}} ("Client") for the website and PWA application.

**Covered Services:**
• Website hosting on Canadian cloud infrastructure
• PWA hosting and distribution
• Daily automated backups with 30-day retention
• SSL certificate management
• Domain DNS management (if applicable)
• Email support during business hours
• Security monitoring and updates`,
      isLocked: false,
      isRequired: true,
      sortOrder: 0,
    },
    {
      key: 'availability',
      title: 'Service Availability',
      content: `**Uptime Guarantee:** 99.9% monthly uptime

**Uptime Calculation:**
Uptime % = ((Total Minutes in Month - Downtime Minutes) / Total Minutes in Month) × 100

**Excluded from Downtime:**
• Scheduled maintenance (with 48-hour notice)
• Client-caused issues
• Force majeure events
• Third-party service outages beyond Provider's control

**Scheduled Maintenance Windows:**
• Saturdays 2:00 AM - 6:00 AM Eastern Time
• Emergency maintenance as needed with best-effort advance notice`,
      isLocked: false,
      isRequired: true,
      sortOrder: 1,
    },
    {
      key: 'response_times',
      title: 'Response Times',
      content: `**Support Hours:** Monday - Friday, 9:00 AM - 5:00 PM Eastern Time

| Priority | Description | Response Time | Resolution Target |
|----------|-------------|---------------|-------------------|
| Critical | Site completely down | 1 hour | 4 hours |
| High | Major feature broken | 4 hours | 24 hours |
| Medium | Minor feature issue | 8 hours | 72 hours |
| Low | Questions, enhancements | 24 hours | Best effort |

**Priority Definitions:**
• **Critical:** Complete service outage affecting all users
• **High:** Major functionality impaired, no workaround available
• **Medium:** Functionality impaired but workaround exists
• **Low:** Cosmetic issues, questions, or enhancement requests`,
      isLocked: false,
      isRequired: true,
      sortOrder: 2,
    },
    {
      key: 'backup_recovery',
      title: 'Backup & Recovery',
      content: `**Backup Schedule:**
• Daily automated backups at 2:00 AM Eastern
• Weekly full backups retained for 4 weeks
• Monthly backups retained for 12 months

**Recovery Time Objective (RTO):** 4 hours
**Recovery Point Objective (RPO):** 24 hours

**Backup Contents:**
• Complete website files and code
• Database content
• Media files and uploads
• Configuration files

**Restoration Requests:**
Client may request restoration from backup at no additional charge for up to 2 requests per month.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 3,
    },
    {
      key: 'security',
      title: 'Security Measures',
      content: `Provider implements the following security measures:

**Infrastructure Security:**
• Enterprise-grade firewalls with intrusion detection
• DDoS protection and mitigation
• Regular security patching and updates
• Encrypted data storage (AES-256)

**Application Security:**
• SSL/TLS encryption for all traffic
• Regular vulnerability scanning
• Web Application Firewall (WAF)
• Secure coding practices

**Access Control:**
• Multi-factor authentication for admin access
• Role-based access control
• Audit logging of administrative actions
• Quarterly access reviews`,
      isLocked: true,
      isRequired: true,
      sortOrder: 4,
    },
    {
      key: 'service_credits',
      title: 'Service Credits',
      content: `If Provider fails to meet the uptime guarantee, Client is entitled to service credits:

| Monthly Uptime | Service Credit |
|----------------|----------------|
| 99.0% - 99.9% | 10% of monthly fee |
| 95.0% - 98.9% | 25% of monthly fee |
| 90.0% - 94.9% | 50% of monthly fee |
| Below 90.0% | 100% of monthly fee |

**Credit Claim Process:**
• Client must request credit within 30 days of incident
• Provider will verify downtime from monitoring logs
• Credits applied to next billing cycle
• Credits do not exceed 100% of monthly fee

**Exclusions:**
Credits do not apply to downtime caused by:
• Scheduled maintenance
• Client actions or content
• Force majeure events`,
      isLocked: false,
      isRequired: true,
      sortOrder: 5,
    },
    {
      key: 'reporting',
      title: 'Reporting & Communication',
      content: `**Monthly Reports:**
Provider will deliver monthly reports including:
• Uptime percentage and any incidents
• Support ticket summary
• Security scan results
• Backup verification status
• Recommendations for improvement

**Incident Communication:**
• Critical incidents: Immediate notification via email
• Planned maintenance: 48 hours advance notice
• Security incidents: Within 24 hours of discovery

**Contact Methods:**
• Email: support@cipherxsolutions.com
• Phone: For critical issues only
• Ticket Portal: For all non-critical requests`,
      isLocked: false,
      isRequired: true,
      sortOrder: 6,
    },
    dataProtectionSection,
    governingLawSection,
    {
      key: 'signatures',
      title: 'Agreement',
      content: `This SLA is effective as of {{DATE}} and remains in effect for the duration of the hosting service agreement.

{{SIGNATURE_BLOCK}}`,
      isLocked: false,
      isRequired: true,
      sortOrder: 100,
    },
  ],
};

// ============================================
// CYBERSECURITY SERVICES TEMPLATES
// ============================================

const cybersecurityProposal: ServiceTemplate = {
  documentType: 'proposal',
  serviceType: 'cybersecurity',
  templateName: 'Cybersecurity Services Proposal',
  pricingModel: 'monthly',
  complianceText: complianceTexts,
  defaultPricing: [
    { id: '1', description: 'Security Assessment (One-time)', quantity: 1, unitPrice: 5000, unit: 'fixed' },
    { id: '2', description: '24/7 Security Monitoring', quantity: 1, unitPrice: 1500, unit: 'month' },
    { id: '3', description: 'Vulnerability Management', quantity: 1, unitPrice: 800, unit: 'month' },
    { id: '4', description: 'Incident Response Retainer', quantity: 1, unitPrice: 500, unit: 'month' },
    { id: '5', description: 'Security Awareness Training', quantity: 1, unitPrice: 200, unit: 'month' },
  ],
  sections: [
    {
      key: 'cover',
      title: 'Cover Page',
      content: `PROPOSAL

Managed Cybersecurity Services

Prepared for: {{CLIENT_NAME}}
Prepared by: CipherX Solutions Inc.
Date: {{DATE}}
Valid Until: {{EXPIRY_DATE}}

CipherX Solutions Inc.
Ottawa, Ontario, Canada
www.cipherxsolutions.com`,
      isLocked: false,
      isRequired: true,
      sortOrder: 0,
    },
    {
      key: 'executive_summary',
      title: 'Executive Summary',
      content: `CipherX Solutions will provide continuous cybersecurity protection, monitoring, vulnerability management, and incident response services to protect {{CLIENT_NAME}}'s digital assets and business operations.

**The Challenge:**
Cyber threats continue to evolve in sophistication and frequency. Organizations of all sizes face risks from ransomware, phishing, data breaches, and targeted attacks. Without dedicated security expertise, businesses remain vulnerable.

**Our Solution:**
CipherX Solutions offers enterprise-grade cybersecurity protection tailored for growing businesses:
• 24/7 security monitoring and threat detection
• Proactive vulnerability management
• Rapid incident response capability
• Compliance support (PIPEDA, PHIPA, industry standards)
• Employee security awareness training

**Why CipherX:**
• Canadian-owned and operated, understanding local compliance requirements
• Experienced team with industry certifications (CISSP, CEH, CompTIA Security+)
• Proven methodology aligned with NIST and ISO 27001 frameworks
• Transparent pricing with no hidden fees`,
      isLocked: false,
      isRequired: true,
      sortOrder: 1,
    },
    {
      key: 'scope',
      title: 'Scope of Services',
      content: `**Initial Security Assessment**
Comprehensive evaluation of your current security posture:
• Network and infrastructure vulnerability assessment
• Application security review
• Policy and procedure gap analysis
• Risk assessment and prioritization
• Remediation roadmap development

**Ongoing Security Services:**

*24/7 Security Monitoring:*
• Continuous monitoring of networks, endpoints, and cloud resources
• Real-time threat detection and alerting
• Security event correlation and analysis
• Monthly security reports and recommendations

*Vulnerability Management:*
• Weekly automated vulnerability scans
• Quarterly penetration testing
• Patch management guidance
• Risk-based prioritization and tracking

*Incident Response:*
• Dedicated incident response team
• 1-hour response for critical incidents
• Investigation, containment, and recovery
• Post-incident analysis and reporting

*Security Awareness Training:*
• Monthly phishing simulations
• Interactive security training modules
• Policy acknowledgment tracking
• Quarterly security briefings`,
      isLocked: false,
      isRequired: true,
      sortOrder: 2,
    },
    {
      key: 'deliverables',
      title: 'Deliverables',
      content: `**Initial Phase (First 30 Days):**
• Comprehensive security assessment report
• Risk register with prioritized findings
• Remediation roadmap
• Security tool deployment and configuration
• Baseline security metrics

**Ongoing Deliverables (Monthly):**
• Security monitoring and alerting (continuous)
• Vulnerability scan reports
• Security posture dashboard access
• Executive summary report
• Recommendations for improvement

**Quarterly Deliverables:**
• Penetration testing report
• Security awareness training metrics
• Policy review and updates
• Business review meeting

**Annual Deliverables:**
• Comprehensive security assessment refresh
• Compliance audit support documentation
• Security program maturity evaluation
• Strategic security roadmap update`,
      isLocked: false,
      isRequired: true,
      sortOrder: 3,
    },
    {
      key: 'compliance',
      title: 'Compliance Support',
      content: `CipherX Solutions helps {{CLIENT_NAME}} meet regulatory requirements:

**PIPEDA Compliance:**
• Personal information protection controls
• Breach notification procedures
• Data handling documentation
• Privacy impact assessments

**PHIPA Compliance (if applicable):**
• PHI protection measures
• Access controls and audit logging
• Secure data transmission
• Incident reporting procedures

**Industry Frameworks:**
• NIST Cybersecurity Framework alignment
• ISO 27001 control mapping
• CIS Critical Security Controls implementation
• SOC 2 preparation support (available as add-on)

**Audit Support:**
• Control documentation
• Evidence collection assistance
• Auditor liaison support
• Gap remediation guidance`,
      isLocked: false,
      isRequired: true,
      sortOrder: 4,
    },
    {
      key: 'pricing',
      title: 'Investment',
      content: `{{PRICING_TABLE}}

**Payment Terms:**
• Initial assessment: Due upon contract signing
• Monthly services: Billed on the 1st of each month
• Net 15 payment terms

**Contract Term:**
• Minimum 12-month commitment for managed services
• Annual prepayment discount: 10% off monthly rates

**What's Included:**
• All monitoring and management tools
• Unlimited security incidents
• Quarterly penetration testing
• Employee training platform access

**Optional Add-ons:**
• Extended hours support: $500/month
• Additional penetration tests: $2,500 each
• Compliance audit preparation: Quoted separately
• Security tool procurement: Cost + 15%`,
      isLocked: false,
      isRequired: true,
      sortOrder: 5,
    },
    {
      key: 'terms',
      title: 'Terms & Conditions',
      content: `**Proposal Validity:** This proposal is valid for 30 days from the date above.

**Service Commencement:** Services begin within 5 business days of contract execution.

**Client Responsibilities:**
• Provide access to systems and documentation as needed
• Designate a primary contact for security matters
• Respond to critical security alerts within 4 hours
• Maintain up-to-date contact information

**Limitations:**
• CipherX does not guarantee prevention of all security incidents
• Client remains responsible for business continuity planning
• Physical security is the Client's responsibility

**Confidentiality:** All security findings and reports are strictly confidential.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 6,
    },
    {
      key: 'acceptance',
      title: 'Acceptance',
      content: `To proceed with this proposal, please sign below.

By signing, {{CLIENT_NAME}} agrees to the scope, timeline, and investment outlined in this proposal.

{{SIGNATURE_BLOCK}}`,
      isLocked: false,
      isRequired: true,
      sortOrder: 7,
    },
  ],
};

const cybersecurityContract: ServiceTemplate = {
  documentType: 'contract',
  serviceType: 'cybersecurity',
  templateName: 'Cybersecurity Services Contract',
  pricingModel: 'monthly',
  complianceText: complianceTexts,
  defaultPricing: cybersecurityProposal.defaultPricing,
  sections: [
    {
      key: 'parties',
      title: 'Parties',
      content: `This Cybersecurity Services Agreement ("Agreement") is entered into as of {{DATE}} ("Effective Date") by and between:

**CipherX Solutions Inc.** ("Provider")
A corporation incorporated under the laws of Ontario, Canada
Principal Place of Business: Ottawa, Ontario

AND

**{{CLIENT_NAME}}** ("Client")
{{CLIENT_ADDRESS}}

Collectively referred to as the "Parties" and individually as a "Party."`,
      isLocked: false,
      isRequired: true,
      sortOrder: 0,
    },
    {
      key: 'definitions',
      title: 'Definitions',
      content: `**"Security Incident"** means any event that threatens the confidentiality, integrity, or availability of Client's information systems or data.

**"Critical Incident"** means a Security Incident that causes or may cause significant business impact, including data breaches, ransomware, or complete system compromise.

**"Vulnerability"** means a weakness in a system, application, or process that could be exploited by a threat actor.

**"Remediation"** means actions taken to fix vulnerabilities or resolve Security Incidents.

**"Security Tools"** means software, hardware, and services used by Provider to deliver security services.

**"Client Environment"** means all systems, networks, applications, and data within scope of this Agreement.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 1,
    },
    {
      key: 'scope',
      title: 'Scope of Services',
      content: `Provider shall deliver the following cybersecurity services:

**Security Monitoring & Detection:**
• 24/7/365 monitoring of Client Environment
• Security Information and Event Management (SIEM)
• Endpoint Detection and Response (EDR)
• Network traffic analysis
• Cloud security monitoring

**Vulnerability Management:**
• Weekly automated vulnerability scanning
• Risk-based vulnerability prioritization
• Remediation guidance and tracking
• Quarterly penetration testing

**Incident Response:**
• Dedicated incident response capability
• Incident investigation and forensics
• Containment and eradication support
• Recovery assistance and lessons learned

**Security Advisory:**
• Threat intelligence briefings
• Security best practice guidance
• Policy and procedure recommendations
• Compliance support

**Training & Awareness:**
• Security awareness training platform
• Simulated phishing campaigns
• Policy acknowledgment tracking`,
      isLocked: false,
      isRequired: true,
      sortOrder: 2,
    },
    {
      key: 'incident_response',
      title: 'Incident Response Obligations',
      content: `**Provider Obligations:**
• Acknowledge Critical Incidents within 15 minutes
• Begin investigation within 1 hour of Critical Incident
• Provide hourly updates during active Critical Incidents
• Document all incidents in incident management system
• Conduct post-incident review within 5 business days

**Client Obligations:**
• Notify Provider immediately upon discovery of potential incidents
• Provide access to affected systems for investigation
• Preserve evidence as directed by Provider
• Designate authorized personnel for incident decisions
• Participate in post-incident reviews

**Escalation Path:**
1. Security Operations Center (SOC)
2. Senior Security Analyst
3. Incident Response Manager
4. Client Account Manager
5. CipherX Executive (for critical business impact)`,
      isLocked: false,
      isRequired: true,
      sortOrder: 3,
    },
    {
      key: 'breach_notification',
      title: 'Breach Notification',
      content: `In the event of a confirmed data breach affecting Client data:

**Immediate Actions (0-24 hours):**
• Provider notifies Client within 1 hour of confirmation
• Joint decision on containment strategy
• Begin forensic investigation
• Engage legal counsel as appropriate

**Short-term Actions (24-72 hours):**
• Complete initial investigation
• Determine scope and impact
• Draft notification to affected parties (if required)
• Report to regulatory authorities (if required)

**Regulatory Compliance:**
• PIPEDA: Report to Privacy Commissioner within 72 hours
• PHIPA: Report to Information and Privacy Commissioner
• Industry-specific: As required by applicable regulations

**Cooperation:**
Both parties agree to cooperate fully in breach response and regulatory communications.`,
      isLocked: true,
      isRequired: true,
      sortOrder: 4,
    },
    {
      key: 'payment',
      title: 'Payment Terms',
      content: `{{PRICING_TABLE}}

**Billing:**
• Monthly services billed on the 1st of each month, payable Net 15
• Initial assessment and setup fees due upon contract execution
• Additional services quoted and billed separately

**Annual Commitment:**
• Minimum 12-month term for managed services
• Early termination subject to remaining contract balance

**Price Adjustments:**
• Prices fixed for initial 12-month term
• Annual price increases capped at 5%
• 60 days notice for any price changes`,
      isLocked: false,
      isRequired: true,
      sortOrder: 5,
    },
    confidentialitySection,
    dataProtectionSection,
    liabilitySection,
    indemnificationSection,
    {
      key: 'termination',
      title: 'Termination',
      content: `**Term:**
Initial term of 12 months, automatically renewing for successive 12-month periods unless either party provides 60 days written notice of non-renewal.

**Termination for Cause:**
• Material breach not cured within 30 days of notice
• Insolvency or bankruptcy
• Failure to pay for more than 45 days

**Transition Assistance:**
Upon termination, Provider shall:
• Provide 30 days of transition support
• Transfer all security documentation and reports
• Assist with handover to new provider
• Delete all Client data within 30 days of transition completion`,
      isLocked: false,
      isRequired: true,
      sortOrder: 11,
    },
    governingLawSection,
    {
      key: 'signatures',
      title: 'Signatures',
      content: `IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.

{{SIGNATURE_BLOCK}}`,
      isLocked: false,
      isRequired: true,
      sortOrder: 100,
    },
  ],
};

const cybersecuritySLA: ServiceTemplate = {
  documentType: 'sla',
  serviceType: 'cybersecurity',
  templateName: 'Cybersecurity Services Level Agreement',
  pricingModel: 'monthly',
  complianceText: complianceTexts,
  defaultPricing: [
    { id: '1', description: 'Managed Security Services', quantity: 1, unitPrice: 2800, unit: 'month' },
  ],
  sections: [
    {
      key: 'service_scope',
      title: 'Service Scope',
      content: `This Service Level Agreement ("SLA") defines the service levels for managed cybersecurity services provided by CipherX Solutions Inc. ("Provider") to {{CLIENT_NAME}} ("Client").

**Services Covered:**
• 24/7 Security Operations Center (SOC) monitoring
• Endpoint Detection and Response (EDR)
• Vulnerability scanning and management
• Incident response and investigation
• Security awareness training
• Compliance reporting`,
      isLocked: false,
      isRequired: true,
      sortOrder: 0,
    },
    {
      key: 'availability',
      title: 'Service Availability',
      content: `**SOC Availability:** 24/7/365
**Monitoring Platform Uptime:** 99.9%

**Coverage Hours:**
• Security Monitoring: 24/7/365
• Incident Response: 24/7/365
• Advisory Services: Monday-Friday, 9 AM - 5 PM Eastern
• Training Platform: 24/7 self-service

**Maintenance Windows:**
Security platform maintenance scheduled during low-risk periods with advance notice.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 1,
    },
    {
      key: 'response_times',
      title: 'Response & Resolution Times',
      content: `| Severity | Description | Response | Update Frequency | Resolution Target |
|----------|-------------|----------|------------------|-------------------|
| Critical | Active breach, ransomware, data exfiltration | 15 min | Every hour | 4 hours containment |
| High | Attempted breach, critical vulnerability exploited | 1 hour | Every 4 hours | 24 hours |
| Medium | Security policy violation, moderate vulnerability | 4 hours | Daily | 72 hours |
| Low | Security questions, best practice inquiries | 8 hours | As needed | 5 business days |

**Severity Definitions:**
• **Critical:** Active attack causing or threatening immediate business impact
• **High:** Security event requiring urgent attention to prevent escalation
• **Medium:** Security concern requiring timely but not urgent response
• **Low:** General security inquiries and non-urgent matters`,
      isLocked: false,
      isRequired: true,
      sortOrder: 2,
    },
    {
      key: 'monitoring',
      title: '24/7 Monitoring',
      content: `**Monitoring Coverage:**
• Network traffic analysis
• Endpoint activity monitoring
• Cloud workload protection
• Email security gateway
• User behavior analytics

**Alert Handling:**
All security alerts are triaged within 15 minutes:
• True Positive: Immediate investigation and response
• Suspicious: Enhanced monitoring and correlation
• False Positive: Documentation and tuning

**Threat Intelligence:**
• Real-time threat feed integration
• Industry-specific threat briefings
• Emerging threat notifications`,
      isLocked: false,
      isRequired: true,
      sortOrder: 3,
    },
    {
      key: 'incident_handling',
      title: 'Critical Incident Handling',
      content: `**Critical Incident Process:**

**Detection (0-15 minutes):**
• Alert generated and acknowledged
• Initial triage and severity assessment
• Client notification initiated

**Investigation (15 min - 2 hours):**
• Scope determination
• Attack vector identification
• Impact assessment

**Containment (2-4 hours):**
• Isolation of affected systems
• Block malicious activity
• Preserve evidence

**Eradication (4-24 hours):**
• Remove threat from environment
• Patch exploited vulnerabilities
• Validate clean state

**Recovery (24-72 hours):**
• Restore affected systems
• Validate business operations
• Enhanced monitoring

**Lessons Learned (Within 5 days):**
• Root cause analysis
• Recommendations for prevention
• Documentation and reporting`,
      isLocked: true,
      isRequired: true,
      sortOrder: 4,
    },
    {
      key: 'backup_recovery',
      title: 'Backup & Recovery Support',
      content: `**Backup Monitoring:**
• Daily verification of backup completion
• Monthly backup restoration testing
• Encrypted backup validation

**Recovery Support:**
In the event of a security incident requiring recovery:
• Coordination with Client IT team
• Malware-free system restoration guidance
• Data integrity verification
• Post-recovery security hardening

**Recovery Objectives:**
• RTO for critical systems: 4 hours (with Client cooperation)
• RPO: Dependent on Client's backup frequency`,
      isLocked: false,
      isRequired: true,
      sortOrder: 5,
    },
    {
      key: 'service_credits',
      title: 'Service Credits',
      content: `**SLA Breach Credits:**

| SLA Breach | Service Credit |
|------------|----------------|
| Critical response > 30 min | 10% monthly fee |
| Critical response > 1 hour | 25% monthly fee |
| Monitoring uptime < 99.9% | 10% monthly fee |
| Monitoring uptime < 99.0% | 25% monthly fee |
| Missed monthly report | 5% monthly fee |

**Maximum Credit:** 50% of monthly fee per billing period

**Exclusions:**
• Client-caused delays
• Force majeure events
• Access or information not provided by Client`,
      isLocked: false,
      isRequired: true,
      sortOrder: 6,
    },
    {
      key: 'reporting',
      title: 'Reporting',
      content: `**Weekly Reports:**
• Security alert summary
• Vulnerability scan status
• Phishing simulation results

**Monthly Reports:**
• Executive security summary
• Threat landscape update
• SLA performance metrics
• Recommendations

**Quarterly Reports:**
• Penetration testing results
• Security program maturity assessment
• Strategic recommendations
• Business review presentation

**On-Demand:**
• Incident reports (within 5 days of resolution)
• Compliance evidence packages
• Custom reports (with reasonable notice)`,
      isLocked: false,
      isRequired: true,
      sortOrder: 7,
    },
    dataProtectionSection,
    governingLawSection,
    {
      key: 'signatures',
      title: 'Agreement',
      content: `This SLA is effective as of {{DATE}} and remains in effect for the duration of the Cybersecurity Services Agreement.

{{SIGNATURE_BLOCK}}`,
      isLocked: false,
      isRequired: true,
      sortOrder: 100,
    },
  ],
};

// ============================================
// WEBSITE ONLY TEMPLATES
// ============================================

const websiteOnlyProposal: ServiceTemplate = {
  ...websitePwaProposal,
  serviceType: 'website_only',
  templateName: 'Website Development Proposal',
  defaultPricing: [
    { id: '1', description: 'Discovery & Planning', quantity: 1, unitPrice: 1500, unit: 'fixed' },
    { id: '2', description: 'UI/UX Design', quantity: 1, unitPrice: 3000, unit: 'fixed' },
    { id: '3', description: 'Website Development', quantity: 1, unitPrice: 5000, unit: 'fixed' },
    { id: '4', description: 'Testing & QA', quantity: 1, unitPrice: 1000, unit: 'fixed' },
    { id: '5', description: 'Launch & Deployment', quantity: 1, unitPrice: 500, unit: 'fixed' },
    { id: '6', description: 'Monthly Hosting (Annual)', quantity: 12, unitPrice: 49, unit: 'month' },
  ],
  sections: websitePwaProposal.sections.map(s => {
    if (s.key === 'executive_summary') {
      return {
        ...s,
        content: `CipherX Solutions will design and develop a modern, professional website to support {{CLIENT_NAME}}'s online presence and business goals.

Our solution will deliver:
• A responsive, mobile-first website optimized for all devices
• Professional design that reflects your brand identity
• Secure, Canadian-hosted infrastructure
• Easy-to-use content management system

This proposal outlines our approach, deliverables, timeline, and investment.`,
      };
    }
    if (s.key === 'scope') {
      return {
        ...s,
        content: `CipherX Solutions will provide the following services:

**Phase 1: Discovery & Planning (Week 1)**
• Requirements gathering
• Site architecture planning
• Technology selection

**Phase 2: Design (Week 2-3)**
• Wireframe development
• Visual design mockups
• Mobile responsive layouts
• Client review and approval

**Phase 3: Development (Week 4-6)**
• Front-end development
• CMS integration
• Contact forms and functionality
• SEO foundation

**Phase 4: Launch (Week 7-8)**
• Testing across browsers and devices
• Performance optimization
• Deployment to production
• Training and handover`,
      };
    }
    return s;
  }),
};

const websiteOnlyContract: ServiceTemplate = {
  ...websitePwaContract,
  serviceType: 'website_only',
  templateName: 'Website Development Service Contract',
  defaultPricing: websiteOnlyProposal.defaultPricing,
};

const websiteOnlySLA: ServiceTemplate = {
  ...websitePwaSLA,
  serviceType: 'website_only',
  templateName: 'Website Hosting Service Level Agreement',
  defaultPricing: [
    { id: '1', description: 'Monthly Hosting & Support', quantity: 1, unitPrice: 49, unit: 'month' },
  ],
};

// ============================================
// PWA ONLY TEMPLATES
// ============================================

const pwaOnlyProposal: ServiceTemplate = {
  ...websitePwaProposal,
  serviceType: 'pwa_only',
  templateName: 'PWA Application Development Proposal',
  defaultPricing: [
    { id: '1', description: 'Discovery & Planning', quantity: 1, unitPrice: 2000, unit: 'fixed' },
    { id: '2', description: 'UI/UX Design', quantity: 1, unitPrice: 3500, unit: 'fixed' },
    { id: '3', description: 'PWA Development', quantity: 1, unitPrice: 6000, unit: 'fixed' },
    { id: '4', description: 'Backend/API Development', quantity: 1, unitPrice: 3000, unit: 'fixed' },
    { id: '5', description: 'Testing & QA', quantity: 1, unitPrice: 1500, unit: 'fixed' },
    { id: '6', description: 'Launch & Deployment', quantity: 1, unitPrice: 1000, unit: 'fixed' },
    { id: '7', description: 'Monthly Hosting (Annual)', quantity: 12, unitPrice: 79, unit: 'month' },
  ],
  sections: websitePwaProposal.sections.map(s => {
    if (s.key === 'executive_summary') {
      return {
        ...s,
        content: `CipherX Solutions will develop a Progressive Web Application (PWA) that delivers a native app-like experience for {{CLIENT_NAME}}'s users across all devices.

Our solution will deliver:
• A PWA that works offline and installs like a native app
• Push notification capability for user engagement
• Fast, responsive performance on any device
• Cross-platform compatibility without app store deployment

This proposal outlines our approach to bringing your PWA vision to life.`,
      };
    }
    return s;
  }),
};

const pwaOnlyContract: ServiceTemplate = {
  ...websitePwaContract,
  serviceType: 'pwa_only',
  templateName: 'PWA Application Service Contract',
  defaultPricing: pwaOnlyProposal.defaultPricing,
};

const pwaOnlySLA: ServiceTemplate = {
  ...websitePwaSLA,
  serviceType: 'pwa_only',
  templateName: 'PWA Hosting Service Level Agreement',
  defaultPricing: [
    { id: '1', description: 'Monthly Hosting & Support', quantity: 1, unitPrice: 79, unit: 'month' },
  ],
};

// ============================================
// GRAPHIC DESIGN TEMPLATES
// ============================================

const graphicDesignProposal: ServiceTemplate = {
  documentType: 'proposal',
  serviceType: 'graphic_design',
  templateName: 'Creative Services Proposal',
  pricingModel: 'package',
  complianceText: complianceTexts,
  defaultPricing: [
    { id: '1', description: 'Brand Identity Package', quantity: 1, unitPrice: 3500, unit: 'fixed' },
    { id: '2', description: 'Logo Design', quantity: 1, unitPrice: 1500, unit: 'fixed' },
    { id: '3', description: 'Marketing Materials', quantity: 1, unitPrice: 2000, unit: 'fixed' },
    { id: '4', description: 'Photography Session', quantity: 4, unitPrice: 500, unit: 'hour' },
    { id: '5', description: 'Video Production', quantity: 1, unitPrice: 3000, unit: 'fixed' },
  ],
  sections: [
    {
      key: 'cover',
      title: 'Cover Page',
      content: `PROPOSAL

Creative & Design Services

Prepared for: {{CLIENT_NAME}}
Prepared by: CipherX Solutions Inc.
Date: {{DATE}}
Valid Until: {{EXPIRY_DATE}}

CipherX Solutions Inc.
Ottawa, Ontario, Canada`,
      isLocked: false,
      isRequired: true,
      sortOrder: 0,
    },
    {
      key: 'executive_summary',
      title: 'Executive Summary',
      content: `CipherX Solutions' creative team will develop compelling visual content and brand materials to elevate {{CLIENT_NAME}}'s market presence and customer engagement.

**Our Creative Capabilities:**
• Brand identity development and refresh
• Graphic design for print and digital
• Professional photography
• Video production and editing
• Social media content creation

We combine strategic thinking with creative excellence to deliver materials that resonate with your target audience and drive business results.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 1,
    },
    {
      key: 'scope',
      title: 'Scope of Work',
      content: `**Branding & Identity:**
• Logo design with variations
• Brand style guide
• Color palette and typography
• Brand asset library

**Graphic Design:**
• Business cards and stationery
• Marketing brochures and flyers
• Digital graphics for web and social
• Presentation templates

**Photography:**
• Professional headshots
• Product photography
• Office/location photography
• Event coverage

**Video Production:**
• Brand story video
• Product/service demonstrations
• Social media video content
• Video editing and post-production`,
      isLocked: false,
      isRequired: true,
      sortOrder: 2,
    },
    {
      key: 'deliverables',
      title: 'Deliverables',
      content: `Upon completion, {{CLIENT_NAME}} will receive:

**Brand Package:**
• Primary logo in all formats (AI, EPS, PNG, SVG)
• Logo variations (horizontal, stacked, icon only)
• Brand style guide (PDF)
• Color codes (HEX, RGB, CMYK, Pantone)
• Typography specifications

**Design Files:**
• Print-ready files (PDF/X)
• Digital assets (web-optimized)
• Source files (upon request)
• Social media templates

**Photography:**
• High-resolution edited images
• Web-optimized versions
• Usage rights documentation

**Video:**
• Final video in multiple formats
• Social media cuts
• Raw footage (upon request)`,
      isLocked: false,
      isRequired: true,
      sortOrder: 3,
    },
    {
      key: 'pricing',
      title: 'Investment',
      content: `{{PRICING_TABLE}}

**Payment Terms:**
• 50% deposit upon agreement
• 50% upon final delivery

**Revisions:**
• 3 rounds of revisions included per deliverable
• Additional revisions: $75/hour

**Licensing:**
All deliverables include full commercial usage rights for {{CLIENT_NAME}}.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 4,
    },
    {
      key: 'terms',
      title: 'Terms & Conditions',
      content: `**Proposal Validity:** 30 days

**Copyright & Ownership:**
Upon final payment, {{CLIENT_NAME}} receives full rights to all deliverables. CipherX Solutions retains the right to display work in portfolio.

**Client Responsibilities:**
• Provide brand assets and content as needed
• Timely feedback on deliverables
• Final approval on all materials

**Cancellation:**
50% of project value due if cancelled after work begins.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 5,
    },
    {
      key: 'acceptance',
      title: 'Acceptance',
      content: `To proceed, please sign below and return with deposit.

{{SIGNATURE_BLOCK}}`,
      isLocked: false,
      isRequired: true,
      sortOrder: 6,
    },
  ],
};

const graphicDesignContract: ServiceTemplate = {
  documentType: 'contract',
  serviceType: 'graphic_design',
  templateName: 'Creative Services Contract',
  pricingModel: 'package',
  complianceText: complianceTexts,
  defaultPricing: graphicDesignProposal.defaultPricing,
  sections: [
    {
      key: 'parties',
      title: 'Parties',
      content: `This Creative Services Agreement ("Agreement") is entered into as of {{DATE}} by and between:

**CipherX Solutions Inc.** ("Provider")
Ottawa, Ontario, Canada

AND

**{{CLIENT_NAME}}** ("Client")
{{CLIENT_ADDRESS}}`,
      isLocked: false,
      isRequired: true,
      sortOrder: 0,
    },
    {
      key: 'definitions',
      title: 'Definitions',
      content: `**"Deliverables"** means all creative work, designs, photographs, videos, and materials produced under this Agreement.

**"Work Product"** means all drafts, concepts, and final deliverables.

**"Brand Assets"** means logos, guidelines, and visual identity elements.

**"Usage Rights"** means the license to use, reproduce, and modify deliverables.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 1,
    },
    {
      key: 'scope',
      title: 'Scope of Services',
      content: `Provider agrees to deliver creative services as specified in the attached Statement of Work, which may include:

• Brand identity design
• Graphic design
• Photography
• Videography
• Content creation

Specific deliverables and timelines are defined in each project's Statement of Work.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 2,
    },
    {
      key: 'ip_ownership',
      title: 'Intellectual Property',
      content: `**Transfer of Rights:**
Upon full payment, Provider assigns to Client all rights, title, and interest in the Deliverables, including copyright.

**Provider Retention:**
Provider retains rights to:
• Pre-existing materials and templates
• Portfolio display rights
• Generic design elements

**Third-Party Materials:**
Any stock photos, fonts, or licensed materials remain subject to their original licenses.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 3,
    },
    {
      key: 'payment',
      title: 'Payment Terms',
      content: `{{PRICING_TABLE}}

**Payment Schedule:**
• 50% due upon contract execution
• 50% due upon final delivery and approval

**Late Payment:**
Overdue amounts accrue 1.5% monthly interest.`,
      isLocked: false,
      isRequired: true,
      sortOrder: 4,
    },
    confidentialitySection,
    liabilitySection,
    {
      key: 'termination',
      title: 'Termination',
      content: `Either party may terminate with 14 days written notice. Upon termination:
• Client pays for all completed work
• Provider delivers all work completed to date
• Ownership transfers for paid work only`,
      isLocked: false,
      isRequired: true,
      sortOrder: 7,
    },
    governingLawSection,
    {
      key: 'signatures',
      title: 'Signatures',
      content: `IN WITNESS WHEREOF, the Parties have executed this Agreement.

{{SIGNATURE_BLOCK}}`,
      isLocked: false,
      isRequired: true,
      sortOrder: 100,
    },
  ],
};

const graphicDesignSLA: ServiceTemplate = {
  documentType: 'sla',
  serviceType: 'graphic_design',
  templateName: 'Creative Services Level Agreement',
  pricingModel: 'hourly',
  complianceText: complianceTexts,
  defaultPricing: [
    { id: '1', description: 'Design Retainer', quantity: 10, unitPrice: 75, unit: 'hour' },
  ],
  sections: [
    {
      key: 'service_scope',
      title: 'Service Scope',
      content: `This SLA covers ongoing creative services provided by CipherX Solutions Inc. to {{CLIENT_NAME}}.

**Covered Services:**
• Graphic design updates
• Marketing material creation
• Social media graphics
• Photography and video editing
• Brand asset management`,
      isLocked: false,
      isRequired: true,
      sortOrder: 0,
    },
    {
      key: 'response_times',
      title: 'Response & Turnaround Times',
      content: `| Request Type | Response | Turnaround |
|--------------|----------|------------|
| Urgent (rush fee applies) | 2 hours | 24 hours |
| Standard | 1 business day | 3-5 business days |
| Complex projects | 1 business day | Quoted separately |`,
      isLocked: false,
      isRequired: true,
      sortOrder: 1,
    },
    {
      key: 'revisions',
      title: 'Revision Policy',
      content: `**Included Revisions:**
• 2 rounds of revisions per deliverable
• Additional revisions billed at hourly rate

**Revision Requests:**
• Submit feedback in consolidated format
• Mark up files or provide clear written direction`,
      isLocked: false,
      isRequired: true,
      sortOrder: 2,
    },
    governingLawSection,
    {
      key: 'signatures',
      title: 'Agreement',
      content: `{{SIGNATURE_BLOCK}}`,
      isLocked: false,
      isRequired: true,
      sortOrder: 100,
    },
  ],
};

// ============================================
// EXPORT ALL TEMPLATES
// ============================================

export const allTemplates: ServiceTemplate[] = [
  // Website + PWA
  websitePwaProposal,
  websitePwaContract,
  websitePwaSLA,
  // Cybersecurity
  cybersecurityProposal,
  cybersecurityContract,
  cybersecuritySLA,
  // Website Only
  websiteOnlyProposal,
  websiteOnlyContract,
  websiteOnlySLA,
  // PWA Only
  pwaOnlyProposal,
  pwaOnlyContract,
  pwaOnlySLA,
  // Graphic Design
  graphicDesignProposal,
  graphicDesignContract,
  graphicDesignSLA,
];

export function getTemplate(
  documentType: DocumentType,
  serviceType: ServiceType
): ServiceTemplate | undefined {
  return allTemplates.find(
    (t) => t.documentType === documentType && t.serviceType === serviceType
  );
}

export function getTemplatesByService(serviceType: ServiceType): ServiceTemplate[] {
  return allTemplates.filter((t) => t.serviceType === serviceType);
}

export function getTemplatesByDocument(documentType: DocumentType): ServiceTemplate[] {
  return allTemplates.filter((t) => t.documentType === documentType);
}

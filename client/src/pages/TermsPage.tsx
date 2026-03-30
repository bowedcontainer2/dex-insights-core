import { Link } from 'react-router-dom';
import styles from './LegalPage.module.css';

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <Link to="/login" className={styles.backLink}>&larr; Back</Link>
        <h1>Terms of Service</h1>
        <p className={styles.updated}>Last updated: March 2026</p>

        <h2>Not Medical Advice</h2>
        <p>
          DayArc is an informational tool only. The AI-generated insights, pattern detection,
          and glucose analysis provided by this application are <strong>not medical advice</strong>.
          They are not intended to diagnose, treat, cure, or prevent any disease or health condition.
        </p>
        <p>
          Always consult your healthcare provider, endocrinologist, or certified diabetes educator
          before making any changes to your treatment plan, medication, diet, or exercise routine
          based on information from this application.
        </p>

        <h2>No Warranty</h2>
        <p>
          This service is provided "as is" without warranty of any kind, express or implied.
          We do not guarantee the accuracy, completeness, or reliability of the glucose data,
          pattern detection, or AI-generated insights. The application may experience downtime,
          data delays, or errors.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          In no event shall the developers or operators of DayArc be liable for any
          direct, indirect, incidental, special, consequential, or punitive damages arising
          from your use of or inability to use this service, including but not limited to
          health outcomes, medical decisions, or data loss.
        </p>

        <h2>Dexcom Account Security</h2>
        <p>
          You are responsible for maintaining the security of your Dexcom account credentials.
          By connecting your Dexcom account, you authorize DayArc to access your glucose
          data through the Dexcom Share API. You may disconnect your Dexcom account at any time
          from the dashboard.
        </p>

        <h2>Account Responsibility</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials
          and for all activities that occur under your account. You must notify us immediately
          of any unauthorized use.
        </p>

        <h2>Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Continued use of the service
          after changes constitutes acceptance of the updated terms.
        </p>
      </div>
    </div>
  );
}

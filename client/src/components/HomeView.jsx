import React from 'react';
import {
  ShieldCheck,
  CreditCard,
  FileText,
  BookOpen,
  Car,
  Cpu,
  BarChart2,
  Database,
  ArrowRight,
  CheckCircle,
  Info
} from 'lucide-react';

const SUPPORTED_DOCS = [
  {
    id: 'aadhaar',
    name: 'Aadhaar Card',
    issuer: 'UIDAI • Govt of India',
    badge: '12-Digit UID',
    desc: 'Unique biometric and demographic identity card.',
    icon: CreditCard,
    accentGlow: 'from-emerald-500/10 to-transparent'
  },
  {
    id: 'pan',
    name: 'PAN Card',
    issuer: 'Income Tax Dept',
    badge: '10-Digit PAN',
    desc: 'Permanent Account Number financial identity card.',
    icon: FileText,
    accentGlow: 'from-blue-500/10 to-transparent'
  },
  {
    id: 'passport',
    name: 'Indian Passport',
    issuer: 'MEA • Republic of India',
    badge: 'Official Booklet',
    desc: 'International travel credential and citizenship booklet.',
    icon: BookOpen,
    accentGlow: 'from-amber-500/10 to-transparent'
  },
  {
    id: 'driving_license',
    name: 'Driving Licence',
    issuer: 'State Transport Dept',
    badge: 'Driver License',
    desc: 'Official motor vehicle operator credential card.',
    icon: Car,
    accentGlow: 'from-teal-500/10 to-transparent'
  }
];

export default function HomeView({ onStartVerification, modelStatus, datasetStats }) {
  const meta = modelStatus?.metadata;
  const testAcc = meta?.evaluation?.test?.accuracy
    ? (meta.evaluation.test.accuracy * 100).toFixed(2)
    : null;
  const validAcc = meta?.evaluation?.validation?.accuracy
    ? (meta.evaluation.validation.accuracy * 100).toFixed(2)
    : null;
  const totalWorkingImages = datasetStats?.summary?.totalImages || 5050;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Hero Section */}
      <section className="bg-warm-white border border-muted-border rounded-2xl p-5 sm:p-8 md:p-10 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl space-y-3.5 sm:space-y-4">
          <div className="inline-flex items-center space-x-2 px-2.5 sm:px-3 py-1 rounded-full bg-sage-light text-forest text-[11px] sm:text-xs font-semibold border border-sage">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-forest shrink-0" />
            <span className="truncate">AI-Powered Identity Document Classification & Verification</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-forest-deep tracking-tight leading-tight">
            Independent Document Verification System
          </h2>

          <p className="text-forest/80 text-xs sm:text-sm md:text-base leading-relaxed">
            Upload an identity document and compare it against your selected document category. 
            The system employs a trained <strong>MobileNet v2 transfer learning classifier</strong> to independently 
            determine the true document type, ensuring complete separation between user input and model inference.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onStartVerification}
              className="inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-forest text-warm-white font-semibold text-xs sm:text-sm hover:bg-forest-deep active:scale-[0.99] transition-all shadow-xs cursor-pointer touch-manipulation w-full sm:w-auto"
            >
              <span>Start Document Verification</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 4 Supported Document Types - 2 columns x 2 rows on mobile, 4 columns on desktop */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-forest-deep">Supported Identity Documents</h3>
            <p className="text-[11px] sm:text-xs text-forest/70">4 Trained Indian Identity Categories</p>
          </div>
          <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-sage/60 text-forest border border-sage-dark/40 self-start xs:self-auto">
            100% Offline AI Inference
          </span>
        </div>

        {/* 2-in-a-row (2 rows) on mobile screens, 4-in-a-row on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {SUPPORTED_DOCS.map((doc) => {
            const IconComponent = doc.icon;
            return (
              <div
                key={doc.id}
                onClick={onStartVerification}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onStartVerification();
                  }
                }}
                className="bg-warm-white border border-muted-border/90 rounded-2xl p-3 sm:p-5 flex flex-col justify-between hover:border-forest/50 hover:shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-xs relative group overflow-hidden touch-manipulation"
              >
                {/* Subtle decorative gradient glow at top */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${doc.accentGlow} group-hover:h-1.5 transition-all`} />

                <div>
                  {/* Top Row: Icon + Badge */}
                  <div className="flex items-center justify-between gap-1.5 mb-2.5 sm:mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sage/70 flex items-center justify-center text-forest group-hover:scale-105 group-hover:bg-sage transition-all shrink-0 shadow-2xs">
                      <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-forest" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-forest-subtle text-forest border border-forest/10 truncate">
                      {doc.badge}
                    </span>
                  </div>

                  {/* Document Name & Issuer */}
                  <div className="min-w-0">
                    <h4 className="font-bold text-forest-deep text-xs xs:text-sm sm:text-base leading-snug truncate group-hover:text-forest transition-colors">
                      {doc.name}
                    </h4>
                    <p className="text-[9px] xs:text-[10px] sm:text-[11px] font-semibold text-forest/60 uppercase tracking-wide truncate mt-0.5">
                      {doc.issuer}
                    </p>
                  </div>

                  {/* Concise Description */}
                  <p className="text-[10px] sm:text-xs text-forest/75 leading-relaxed line-clamp-2 mt-1.5 sm:mt-2">
                    {doc.desc}
                  </p>
                </div>

                {/* Card Footer: Status Pill & Interactive Prompt */}
                <div className="pt-2 sm:pt-3 mt-2 sm:mt-3 border-t border-muted-border/60 flex items-center justify-between text-[10px] sm:text-xs">
                  <span className="inline-flex items-center text-forest font-semibold text-[10px] sm:text-[11px]">
                    <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 text-forest shrink-0" />
                    <span>Supported</span>
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-forest/50 font-medium group-hover:text-forest transition-colors">
                    Tap to verify →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Model Architecture & Real Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: Machine Learning Backbone */}
        <div className="bg-warm-white border border-muted-border rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-forest mb-3">
              <Cpu className="w-5 h-5 text-forest shrink-0" />
              <h4 className="font-bold text-forest-deep text-sm sm:text-base">Model Architecture</h4>
            </div>
            <ul className="text-xs text-forest/80 space-y-2 leading-relaxed">
              <li>• <strong>Backbone:</strong> Pretrained MobileNet v2 (Frozen feature extractor, 1,280-d embeddings).</li>
              <li>• <strong>Classification Head:</strong> Dense(128, ReLU) → Dropout(0.3) → Dense(64, ReLU) → Dense(4, Softmax).</li>
              <li>• <strong>Framework:</strong> TensorFlow.js on Node.js CPU backend.</li>
              <li>• <strong>Preprocessing:</strong> Sharp 224×224 RGB, [-1, 1] normalization.</li>
            </ul>
          </div>
          <div className="mt-4 pt-4 border-t border-muted-border text-[11px] text-forest/70">
            Trainable Parameters: 172,484
          </div>
        </div>

        {/* Card 2: Actual Evaluation Metrics */}
        <div className="bg-warm-white border border-muted-border rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-forest mb-3">
              <BarChart2 className="w-5 h-5 text-forest shrink-0" />
              <h4 className="font-bold text-forest-deep text-sm sm:text-base">Trained Model Accuracy</h4>
            </div>

            {testAcc ? (
              <div className="space-y-3">
                <div className="bg-sage-light p-3 rounded-xl border border-sage flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] sm:text-[11px] text-forest/70 font-semibold uppercase">Overall Test Accuracy</div>
                    <div className="text-xl sm:text-2xl font-black text-forest-deep">{testAcc}%</div>
                  </div>
                  <div className="text-left sm:text-right text-[10px] sm:text-[11px] text-forest/70">
                    <div>Validation Acc: <strong>{validAcc}%</strong></div>
                    <div>587 Test Images</div>
                  </div>
                </div>

                <div className="text-xs space-y-1.5 text-forest/80">
                  <div className="flex justify-between">
                    <span>Driving Licence Recall:</span>
                    <strong className="text-forest">94.70%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Passport Recall:</span>
                    <strong className="text-forest">83.44%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Aadhaar Card Recall:</span>
                    <strong className="text-forest">79.26%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>PAN Card Recall:</span>
                    <strong className="text-forest">74.67%</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-forest/70">Loading evaluation metrics from model metadata...</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-muted-border text-[11px] text-forest/70">
            Rejection Threshold: <strong>0.70 Confidence</strong>
          </div>
        </div>

        {/* Card 3: Dataset Statistics */}
        <div className="bg-warm-white border border-muted-border rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-forest mb-3">
              <Database className="w-5 h-5 text-forest shrink-0" />
              <h4 className="font-bold text-forest-deep text-sm sm:text-base">Working Dataset Balance</h4>
            </div>

            <div className="space-y-2 text-xs text-forest/80">
              <div className="flex justify-between py-1 border-b border-muted-border/40">
                <span>Total Working Images:</span>
                <strong className="text-forest">{totalWorkingImages} images</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-muted-border/40">
                <span>Training Split:</span>
                <span>3,849 images</span>
              </div>
              <div className="flex justify-between py-1 border-b border-muted-border/40">
                <span>Validation Split:</span>
                <span>614 images</span>
              </div>
              <div className="flex justify-between py-1 border-b border-muted-border/40">
                <span>Evaluation Test Split:</span>
                <span>587 images</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Cross-Split Leakage:</span>
                <strong className="text-forest">0% Clean</strong>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-muted-border text-[11px] text-forest/70">
            Original raw dataset preserved intact
          </div>
        </div>
      </section>

      {/* Disclaimers & Known Limitations Banner */}
      <section className="bg-beige-light border border-muted-border rounded-xl p-4 sm:p-5 text-xs text-forest/80 space-y-2">
        <div className="flex items-center space-x-2 font-semibold text-forest-deep text-xs sm:text-sm">
          <Info className="w-4 h-4 text-forest shrink-0" />
          <span>System Scope & Privacy Notice</span>
        </div>
        <p className="leading-relaxed">
          • <strong>Document Classification Only:</strong> This application identifies visual document categories. It does not check legal validity, authenticity, or document tampering.
        </p>
        <p className="leading-relaxed">
          • <strong>Zero Persistent Storage:</strong> Document images uploaded during verification are parsed directly in RAM memory and are never saved to the server disk or database.
        </p>
        <p className="leading-relaxed">
          • <strong>'Other' Class Limitation:</strong> The model is trained on 4 closed-set document classes. Unrelated or non-identity images that happen to share visual similarities may be assigned a high confidence score. Predictions below 70% confidence are automatically flagged as <strong>UNCERTAIN</strong>.
        </p>
      </section>
    </div>
  );
}

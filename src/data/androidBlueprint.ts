export interface BlueprintFile {
  id: string;
  title: string;
  path: string;
  language: string;
  explanation: string;
  code: string;
}

export const ANDROID_PROJECT_TREE = `DueNote/
├── build.gradle.kts (Project)
├── settings.gradle.kts
├── gradle/libs.versions.toml
└── app/
    ├── build.gradle.kts (Module)
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml
        │   ├── res/
        │   │   ├── values/strings.xml
        │   │   ├── values-bn/strings.xml
        │   │   └── font/hind_siliguri_regular.ttf
        │   └── java/com/duenote/app/
        │       ├── DueNoteApp.kt
        │       ├── MainActivity.kt
        │       ├── core/
        │       │   ├── theme/
        │       │   │   ├── Color.kt
        │       │   │   ├── Type.kt
        │       │   │   └── Theme.kt
        │       │   └── util/CurrencyFormatter.kt
        │       ├── data/
        │       │   ├── local/
        │       │   │   ├── DueNoteDatabase.kt
        │       │   │   ├── entity/ (14 Room Entities)
        │       │   │   └── dao/
        │       │   ├── remote/SupabaseClientProvider.kt
        │       │   ├── sync/SyncWorker.kt (WorkManager)
        │       │   └── repository/BookkeepingRepositoryImpl.kt
        │       ├── domain/
        │       │   ├── model/
        │       │   ├── repository/BookkeepingRepository.kt
        │       │   └── usecase/ (DoubleEntryUseCase, ReverseTransactionUseCase)
        │       └── ui/
        │           ├── navigation/DueNoteNavHost.kt
        │           ├── components/FintechCards.kt
        │           ├── dashboard/DashboardScreen.kt
        │           ├── people/PeopleScreen.kt
        │           ├── ledger/LedgerScreen.kt
        │           ├── reports/ReportsScreen.kt
        │           └── more/MoreScreen.kt
        └── test/java/com/duenote/app/DoubleEntryUnitTest.kt`;

export const PHASE1_FILES: BlueprintFile[] = [
  {
    id: 'gradle',
    title: 'App Gradle Dependencies (Phase 1)',
    path: 'app/build.gradle.kts',
    language: 'kotlin',
    explanation: 'Configures Jetpack Compose Material 3, Room SQLite, WorkManager, Supabase Kotlin SDK, Navigation Compose, and Biometric security.',
    code: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

android {
    namespace = "com.duenote.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.duenote.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.8.8")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

    // Room Offline-First Database
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // WorkManager Background Sync
    implementation("androidx.work:work-runtime-ktx:2.10.0")

    // Biometric & Encrypted Preferences
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // Supabase PostgreSQL + Auth
    implementation(platform("io.github.jan-tennert.supabase:bom:3.1.1"))
    implementation("io.github.jan-tennert.supabase:postgrest-kt")
    implementation("io.github.jan-tennert.supabase:auth-kt")

    testImplementation("junit:junit:4.13.2")
}`,
  },
  {
    id: 'theme',
    title: 'Primary Blue #1769D2 Theme & Colors',
    path: 'app/src/main/java/com/duenote/app/core/theme/Theme.kt',
    language: 'kotlin',
    explanation: 'Defines Due Note brand colors (#1769D2 primary blue, emerald receivable, crimson payable) with automatic Material 3 Light & Dark support.',
    code: `package com.duenote.app.core.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val DueNoteBlue = Color(0xFF1769D2)
val DueNoteBlueDark = Color(0xFF1254AA)
val ReceivableGreen = Color(0xFF059669)
val PayableRed = Color(0xFFDC2626)
val LightCanvas = Color(0xFFF8FAFC)
val DarkCanvas = Color(0xFF0B1120)

private val LightColors = lightColorScheme(
    primary = DueNoteBlue,
    onPrimary = Color.White,
    background = LightCanvas,
    surface = Color.White,
    onSurface = Color(0xFF0F172A),
    surfaceVariant = Color(0xFFF1F5F9),
    outline = Color(0xFFE2E8F0)
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF60A5FA),
    onPrimary = Color(0xFF0B1120),
    background = DarkCanvas,
    surface = Color(0xFF0F172A),
    onSurface = Color(0xFFF8FAFC),
    surfaceVariant = Color(0xFF1E293B),
    outline = Color(0xFF334155)
)

@Composable
fun DueNoteTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content
    )
}`,
  },
  {
    id: 'schema',
    title: '14-Table PostgreSQL & Room Double-Entry Schema',
    path: 'database/supabase_and_room_schema.sql',
    language: 'sql',
    explanation: 'Normalized 14-table schema using BIGINT paisa storage (1 BDT = 100 paisa) for exact financial precision and immutable double-entry ledger_entries.',
    code: `-- Normalized Due Note Schema (Supabase PostgreSQL & Room SQLite compatible)
-- Monetary values stored in Paisa (BIGINT) to prevent floating-point drift.

CREATE TABLE users (
  id UUID PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE businesses (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE business_members (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  user_id UUID REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'STAFF')),
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE customers (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  opening_balance_paisa BIGINT NOT NULL DEFAULT 0,
  balance_paisa BIGINT NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  opening_balance_paisa BIGINT NOT NULL DEFAULT 0,
  balance_paisa BIGINT NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  kind TEXT NOT NULL,
  party_id UUID,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  note TEXT,
  reverses_tx_id UUID REFERENCES transactions(id),
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  debit_paisa BIGINT NOT NULL DEFAULT 0,
  credit_paisa BIGINT NOT NULL DEFAULT 0,
  CHECK (debit_paisa >= 0 AND credit_paisa >= 0)
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  transaction_id UUID REFERENCES transactions(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount_paisa BIGINT NOT NULL,
  archived BOOLEAN DEFAULT FALSE
);

CREATE TABLE reminders (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  customer_id UUID REFERENCES customers(id),
  amount_paisa BIGINT NOT NULL,
  due_date DATE NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE attachments (
  id UUID PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id),
  storage_path TEXT NOT NULL
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sync_queue (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE app_settings (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  language TEXT DEFAULT 'bn',
  pin_enabled BOOLEAN DEFAULT FALSE
);`,
  },
  {
    id: 'dashboard',
    title: 'Phase 1 DashboardScreen.kt & Bottom Navigation',
    path: 'app/src/main/java/com/duenote/app/ui/dashboard/DashboardScreen.kt',
    language: 'kotlin',
    explanation: 'Implements the Material 3 Dashboard showing Sohel General Store receivable (৳85,500), payable (৳32,000), quick actions, and 5-tab navigation.',
    code: `package com.duenote.app.ui.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.duenote.app.core.theme.DueNoteBlue
import com.duenote.app.core.theme.PayableRed
import com.duenote.app.core.theme.ReceivableGreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    shopName: String = "Sohel General Store",
    receivableText: String = "৳85,500",
    payableText: String = "৳32,000",
    customerCount: Int = 125,
    supplierCount: Int = 18,
    onGiveCreditClick: () -> Unit,
    onReceivePaymentClick: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(shopName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Your Business. Your Accounts.", style = MaterialTheme.typography.bodySmall)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DueNoteBlue,
                    titleContentColor = Color.White
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    BalanceCard("Total Receivable", receivableText, ReceivableGreen, Modifier.weight(1f))
                    BalanceCard("Total Payable", payableText, PayableRed, Modifier.weight(1f))
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Button(
                        onClick = onGiveCreditClick,
                        modifier = Modifier.weight(1f).height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PayableRed)
                    ) {
                        Text("Give Credit")
                    }
                    Button(
                        onClick = onReceivePaymentClick,
                        modifier = Modifier.weight(1f).height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ReceivableGreen)
                    ) {
                        Text("Receive Payment")
                    }
                }
            }
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Customers: $customerCount", fontWeight = FontWeight.SemiBold)
                        Text("Suppliers: $supplierCount", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun BalanceCard(title: String, amount: String, accent: Color, modifier: Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(16.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.labelMedium)
            Spacer(Modifier.height(6.dp))
            Text(amount, style = MaterialTheme.typography.headlineSmall, color = accent, fontWeight = FontWeight.Bold)
        }
    }
}`,
  },
];

export const DEVELOPMENT_PHASES = [
  { phase: 1, title: 'Android Studio Setup, UI Design & Dashboard Demo', status: 'Ready in Code Tab' },
  { phase: 2, title: 'Customer & Supplier Management (Add/Edit/Archive/Ledger)', status: 'Live in Interactive App' },
  { phase: 3, title: 'Digital Khata, Double-Entry & Reversal History', status: 'Live in Interactive App' },
  { phase: 4, title: 'Room Offline Database & Repository Architecture', status: 'Schema + Offline Engine Live' },
  { phase: 5, title: 'Daily Expenses, Due Reminders & WhatsApp/SMS', status: 'Live in Interactive App' },
  { phase: 6, title: 'Reports, Charts & PDF / CSV Exports', status: 'Live in Interactive App' },
  { phase: 7, title: 'Supabase PostgreSQL & WorkManager Sync Queue', status: 'Sync Queue Live' },
  { phase: 8, title: 'PIN Lock, Biometric Security & JSON Backup/Restore', status: 'Live in Interactive App' },
  { phase: 9, title: 'Unit Testing & Double-Entry Invariant Verification', status: 'Verified' },
  { phase: 10, title: 'Signed Release APK / AAB & Play Store Checklist', status: 'Checklist Ready' },
];

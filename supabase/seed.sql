-- ============================================================
-- Vivid Care — Seed Data for Staging/Development
-- Run AFTER all migrations are applied.
-- Requires two auth users already created (see setup instructions).
-- ============================================================

-- ============================================================
-- IMPORTANT: Before running this seed, create these auth users
-- via Supabase Dashboard > Authentication > Users:
--
-- 1. admin@vividcare.test / Password123!
--    → User metadata: {"role": "admin", "full_name": "Sarah Mitchell"}
--
-- 2. staff1@vividcare.test / Password123!
--    → User metadata: {"role": "staff", "full_name": "James Okonkwo"}
--
-- 3. staff2@vividcare.test / Password123!
--    → User metadata: {"role": "staff", "full_name": "Priya Sharma"}
--
-- 4. staff3@vividcare.test / Password123!
--    → User metadata: {"role": "staff", "full_name": "Tom Nguyen"}
--
-- 5. staff4@vividcare.test / Password123!
--    → User metadata: {"role": "staff", "full_name": "Elena Vasquez"}
--
-- The handle_new_user trigger auto-creates profiles.
-- After creating users, copy their UUIDs below.
-- ============================================================

-- Replace these with actual UUIDs from auth.users after creation:
DO $$
DECLARE
  admin_id uuid;
  staff1_id uuid;
  staff2_id uuid;
  staff3_id uuid;
  staff4_id uuid;
  -- client IDs
  client_active_1 uuid;
  client_active_2 uuid;
  client_active_3 uuid;
  client_inactive uuid;
  -- shift IDs
  shift_scheduled_1 uuid;
  shift_scheduled_2 uuid;
  shift_active_1 uuid;
  shift_completed_1 uuid;
  shift_completed_2 uuid;
  shift_missed uuid;
  shift_cancelled uuid;
  shift_unassigned uuid;
BEGIN

  -- ============================================================
  -- RESOLVE USER IDs
  -- ============================================================
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@vividcare.test' LIMIT 1;
  SELECT id INTO staff1_id FROM auth.users WHERE email = 'staff1@vividcare.test' LIMIT 1;
  SELECT id INTO staff2_id FROM auth.users WHERE email = 'staff2@vividcare.test' LIMIT 1;
  SELECT id INTO staff3_id FROM auth.users WHERE email = 'staff3@vividcare.test' LIMIT 1;
  SELECT id INTO staff4_id FROM auth.users WHERE email = 'staff4@vividcare.test' LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin user not found. Create auth users first (see instructions above).';
  END IF;

  -- Update profiles with emails and phones
  UPDATE public.profiles SET email = 'admin@vividcare.test', phone = '0412 000 001' WHERE id = admin_id;
  UPDATE public.profiles SET email = 'staff1@vividcare.test', phone = '0412 000 002' WHERE id = staff1_id;
  UPDATE public.profiles SET email = 'staff2@vividcare.test', phone = '0412 000 003' WHERE id = staff2_id;
  UPDATE public.profiles SET email = 'staff3@vividcare.test', phone = '0412 000 004' WHERE id = staff3_id;
  UPDATE public.profiles SET email = 'staff4@vividcare.test', phone = '0412 000 005' WHERE id = staff4_id;

  -- ============================================================
  -- CLIENTS
  -- ============================================================

  -- Active clients
  INSERT INTO public.clients (id, full_name, age, date_of_birth, address, lat, lng, ndis_number, phone, email, emergency_contact, notes, status, created_by)
  VALUES
    (gen_random_uuid(), 'Margaret Thompson', 72, '1953-08-14', '45 Stirling Hwy, Nedlands WA 6009', -31.9812, 115.8039, '4310001234', '08 9123 4567', 'margaret.t@example.com', 'Son: David Thompson 0412 999 001', 'Requires mobility assistance, gentle demeanour. Prefers female support workers.', 'active', admin_id),
    (gen_random_uuid(), 'Ahmed Hassan', 34, '1991-03-22', '12 Railway Parade, Midland WA 6056', -31.8866, 116.0113, '4320005678', '0413 456 789', 'ahmed.h@example.com', 'Brother: Khalid Hassan 0413 999 002', 'Community access focus. Enjoys swimming and library visits.', 'active', admin_id),
    (gen_random_uuid(), 'Lucy Chen', 28, '1997-11-05', '88 Beaufort St, Perth WA 6000', -31.9385, 115.8628, '4330009012', '0414 567 890', 'lucy.c@example.com', 'Mother: Wei Chen 0414 999 003', 'Medication support required. See medication chart in documents.', 'active', admin_id);

  -- Get all client IDs
  SELECT id INTO client_active_1 FROM public.clients WHERE full_name = 'Margaret Thompson';
  SELECT id INTO client_active_2 FROM public.clients WHERE full_name = 'Ahmed Hassan';
  SELECT id INTO client_active_3 FROM public.clients WHERE full_name = 'Lucy Chen';

  -- Inactive client
  INSERT INTO public.clients (id, full_name, age, date_of_birth, address, phone, ndis_number, notes, status, created_by)
  VALUES (gen_random_uuid(), 'Robert Williams', 55, '1970-06-30', '3 South Tce, Fremantle WA 6160', '08 9234 5678', '4340001111', 'Service agreement expired. Pending re-engagement.', 'inactive', admin_id);

  SELECT id INTO client_inactive FROM public.clients WHERE full_name = 'Robert Williams';

  -- ============================================================
  -- DOCUMENTS (staff compliance)
  -- ============================================================

  -- Staff 1 (James): Roster-ready — all documents valid
  INSERT INTO public.documents (owner_id, owner_type, doc_type, file_name, file_url, expiry_date, status, uploaded_by)
  VALUES
    (staff1_id, 'staff', 'Police Clearance', 'james_police_clearance_2024.pdf', 'https://placeholder.docs/james_police.pdf', CURRENT_DATE + INTERVAL '14 months', 'active', admin_id),
    (staff1_id, 'staff', 'Working With Children Check', 'james_wwcc_2024.pdf', 'https://placeholder.docs/james_wwcc.pdf', CURRENT_DATE + INTERVAL '24 months', 'active', admin_id),
    (staff1_id, 'staff', 'CPR Certificate', 'james_cpr_2024.pdf', 'https://placeholder.docs/james_cpr.pdf', CURRENT_DATE + INTERVAL '10 months', 'active', admin_id),
    (staff1_id, 'staff', 'Manual Handling Certificate', 'james_manual_handling.pdf', 'https://placeholder.docs/james_manual.pdf', CURRENT_DATE + INTERVAL '18 months', 'active', admin_id);

  -- Staff 2 (Priya): Has expiring documents (within 45 days)
  INSERT INTO public.documents (owner_id, owner_type, doc_type, file_name, file_url, expiry_date, status, uploaded_by)
  VALUES
    (staff2_id, 'staff', 'Police Clearance', 'priya_police_2022.pdf', 'https://placeholder.docs/priya_police.pdf', CURRENT_DATE + INTERVAL '30 days', 'near_expiry', admin_id),
    (staff2_id, 'staff', 'Working With Children Check', 'priya_wwcc_2023.pdf', 'https://placeholder.docs/priya_wwcc.pdf', CURRENT_DATE + INTERVAL '6 months', 'active', admin_id),
    (staff2_id, 'staff', 'CPR Certificate', 'priya_cpr_2024.pdf', 'https://placeholder.docs/priya_cpr.pdf', CURRENT_DATE + INTERVAL '42 days', 'near_expiry', admin_id);

  -- Staff 3 (Tom): Blocked — has expired documents
  INSERT INTO public.documents (owner_id, owner_type, doc_type, file_name, file_url, expiry_date, status, uploaded_by)
  VALUES
    (staff3_id, 'staff', 'Police Clearance', 'tom_police_2021.pdf', 'https://placeholder.docs/tom_police.pdf', CURRENT_DATE - INTERVAL '45 days', 'expired', admin_id),
    (staff3_id, 'staff', 'Working With Children Check', 'tom_wwcc_2022.pdf', 'https://placeholder.docs/tom_wwcc.pdf', CURRENT_DATE - INTERVAL '10 days', 'expired', admin_id),
    (staff3_id, 'staff', 'CPR Certificate', 'tom_cpr_2023.pdf', 'https://placeholder.docs/tom_cpr.pdf', CURRENT_DATE + INTERVAL '3 months', 'active', admin_id);

  -- Staff 4 (Elena): Mix — one expired, one valid
  INSERT INTO public.documents (owner_id, owner_type, doc_type, file_name, file_url, expiry_date, status, uploaded_by)
  VALUES
    (staff4_id, 'staff', 'Police Clearance', 'elena_police_2023.pdf', 'https://placeholder.docs/elena_police.pdf', CURRENT_DATE + INTERVAL '11 months', 'active', admin_id),
    (staff4_id, 'staff', 'CPR Certificate', 'elena_cpr_2022.pdf', 'https://placeholder.docs/elena_cpr.pdf', CURRENT_DATE - INTERVAL '5 days', 'expired', admin_id);

  -- Client documents
  INSERT INTO public.documents (owner_id, owner_type, doc_type, file_name, file_url, expiry_date, status, uploaded_by)
  VALUES
    (client_active_1, 'client', 'NDIS Service Agreement', 'margaret_service_agreement.pdf', 'https://placeholder.docs/margaret_sa.pdf', CURRENT_DATE + INTERVAL '8 months', 'active', admin_id),
    (client_active_1, 'client', 'Risk Assessment', 'margaret_risk_assessment.pdf', 'https://placeholder.docs/margaret_risk.pdf', CURRENT_DATE + INTERVAL '5 months', 'active', admin_id),
    (client_active_2, 'client', 'NDIS Service Agreement', 'ahmed_service_agreement.pdf', 'https://placeholder.docs/ahmed_sa.pdf', CURRENT_DATE + INTERVAL '2 months', 'active', admin_id),
    (client_active_3, 'client', 'Risk Assessment', 'lucy_risk_assessment.pdf', 'https://placeholder.docs/lucy_risk.pdf', CURRENT_DATE + INTERVAL '14 days', 'near_expiry', admin_id);

  -- ============================================================
  -- SHIFTS
  -- ============================================================

  -- Scheduled shifts (future)
  INSERT INTO public.shifts (id, staff_id, client_id, title, support_type, support_type_key, start_time, end_time, status, notes, created_by)
  VALUES
    (gen_random_uuid(), staff1_id, client_active_1, 'Morning personal care', 'Personal Care', 'personal_care',
     (CURRENT_DATE + 1) + TIME '07:00', (CURRENT_DATE + 1) + TIME '09:30', 'scheduled',
     'Assist with morning routine. Check mobility aids.', admin_id),
    (gen_random_uuid(), staff2_id, client_active_2, 'Community access — library', 'Community Access', 'community_access',
     (CURRENT_DATE + 1) + TIME '13:00', (CURRENT_DATE + 1) + TIME '16:00', 'scheduled',
     'Transport to Midland library. Bring reading list.', admin_id),
    (gen_random_uuid(), staff1_id, client_active_3, 'Medication support', 'Medication Support', 'medication_support',
     (CURRENT_DATE + 2) + TIME '08:00', (CURRENT_DATE + 2) + TIME '09:00', 'scheduled',
     'Morning medication round. Check dosette box.', admin_id);

  SELECT id INTO shift_scheduled_1 FROM public.shifts WHERE title = 'Morning personal care' AND status = 'scheduled';
  SELECT id INTO shift_scheduled_2 FROM public.shifts WHERE title = 'Community access — library' AND status = 'scheduled';

  -- Active shift (in progress now)
  INSERT INTO public.shifts (id, staff_id, client_id, title, support_type, support_type_key, start_time, end_time, status, clock_in_time, clock_in_lat, clock_in_lng, notes, created_by)
  VALUES
    (gen_random_uuid(), staff1_id, client_active_2, 'Afternoon community walk', 'Community Access', 'community_access',
     now() - INTERVAL '45 minutes', now() + INTERVAL '75 minutes', 'active',
     now() - INTERVAL '43 minutes', -31.8870, 116.0120,
     'Walk around Midland park area. Ahmed enjoys the pond.', admin_id);

  SELECT id INTO shift_active_1 FROM public.shifts WHERE status = 'active' AND title = 'Afternoon community walk';

  -- Completed shifts (past)
  INSERT INTO public.shifts (id, staff_id, client_id, title, support_type, support_type_key, start_time, end_time, status, clock_in_time, clock_in_lat, clock_in_lng, clock_out_time, clock_out_lat, clock_out_lng, documentation_status, notes, created_by)
  VALUES
    (gen_random_uuid(), staff1_id, client_active_1, 'Evening personal care', 'Personal Care', 'personal_care',
     (CURRENT_DATE - 1) + TIME '17:00', (CURRENT_DATE - 1) + TIME '19:00', 'completed',
     (CURRENT_DATE - 1) + TIME '16:58', -31.9815, 115.8042,
     (CURRENT_DATE - 1) + TIME '19:05', -31.9812, 115.8039,
     'documented', 'Completed evening routine. Margaret in good spirits.', admin_id),
    (gen_random_uuid(), staff2_id, client_active_3, 'Medication support', 'Medication Support', 'medication_support',
     (CURRENT_DATE - 2) + TIME '08:00', (CURRENT_DATE - 2) + TIME '09:00', 'completed',
     (CURRENT_DATE - 2) + TIME '07:55', -31.9390, 115.8630,
     (CURRENT_DATE - 2) + TIME '09:02', -31.9385, 115.8628,
     'documented', 'All medications administered without issue.', admin_id);

  SELECT id INTO shift_completed_1 FROM public.shifts WHERE title = 'Evening personal care' AND status = 'completed';
  SELECT id INTO shift_completed_2 FROM public.shifts WHERE title = 'Medication support' AND status = 'completed' AND staff_id = staff2_id;

  -- Missed shift (past, never clocked in)
  INSERT INTO public.shifts (id, staff_id, client_id, title, support_type, support_type_key, start_time, end_time, status, notes, created_by)
  VALUES
    (gen_random_uuid(), staff3_id, client_active_1, 'Morning check-in', 'General Daily Support', 'general_support',
     (CURRENT_DATE - 3) + TIME '08:00', (CURRENT_DATE - 3) + TIME '10:00', 'scheduled',
     'Staff never clocked in. Escalated.', admin_id);

  SELECT id INTO shift_missed FROM public.shifts WHERE title = 'Morning check-in' AND staff_id = staff3_id;

  -- Cancelled shift
  INSERT INTO public.shifts (id, staff_id, client_id, title, support_type, support_type_key, start_time, end_time, status, notes, created_by)
  VALUES
    (gen_random_uuid(), staff4_id, client_active_2, 'Community outing', 'Community Access', 'community_access',
     (CURRENT_DATE - 1) + TIME '10:00', (CURRENT_DATE - 1) + TIME '14:00', 'cancelled',
     'Client unwell — cancelled by coordinator.', admin_id);

  SELECT id INTO shift_cancelled FROM public.shifts WHERE status = 'cancelled' AND staff_id = staff4_id;

  -- Unassigned shift
  INSERT INTO public.shifts (id, staff_id, client_id, title, support_type, support_type_key, start_time, end_time, status, notes, created_by)
  VALUES
    (gen_random_uuid(), NULL, client_active_3, 'Personal care coverage needed', 'Personal Care', 'personal_care',
     (CURRENT_DATE + 3) + TIME '07:00', (CURRENT_DATE + 3) + TIME '09:00', 'scheduled',
     'Needs assignment — regular worker on leave.', admin_id);

  SELECT id INTO shift_unassigned FROM public.shifts WHERE staff_id IS NULL;

  -- ============================================================
  -- CLOCK EVENTS (auto-generated by trigger for active/completed shifts)
  -- The trigger fires on UPDATE, but we inserted completed shifts directly.
  -- Manually seed clock events for completed and active shifts.
  -- ============================================================

  INSERT INTO public.clock_events (shift_id, staff_id, type, lat, lng, created_at)
  VALUES
    -- Completed shift 1
    (shift_completed_1, staff1_id, 'clock_in', -31.9815, 115.8042, (CURRENT_DATE - 1) + TIME '16:58'),
    (shift_completed_1, staff1_id, 'clock_out', -31.9812, 115.8039, (CURRENT_DATE - 1) + TIME '19:05'),
    -- Completed shift 2
    (shift_completed_2, staff2_id, 'clock_in', -31.9390, 115.8630, (CURRENT_DATE - 2) + TIME '07:55'),
    (shift_completed_2, staff2_id, 'clock_out', -31.9385, 115.8628, (CURRENT_DATE - 2) + TIME '09:02'),
    -- Active shift (clock in only)
    (shift_active_1, staff1_id, 'clock_in', -31.8870, 116.0120, now() - INTERVAL '43 minutes');

  -- ============================================================
  -- INCIDENTS
  -- ============================================================

  INSERT INTO public.incidents (shift_id, staff_id, client_id, title, description, severity, status, reported_at)
  VALUES
    (shift_completed_1, staff1_id, client_active_1, 'Near-fall during transfer',
     'Margaret experienced a near-fall during bed-to-wheelchair transfer. No injury sustained. Grip bar may need adjustment.',
     'high', 'investigating', (CURRENT_DATE - 1) + TIME '18:30'),
    (shift_completed_2, staff2_id, client_active_3, 'Medication refused',
     'Lucy refused evening medication citing nausea. Documented and escalated to care coordinator.',
     'medium', 'open', (CURRENT_DATE - 2) + TIME '08:45'),
    (NULL, staff3_id, client_active_2, 'Vehicle breakdown during transport',
     'Company vehicle broke down en route to community access appointment. Called roadside assistance. Client was not in vehicle.',
     'low', 'resolved', CURRENT_DATE - INTERVAL '5 days'),
    (shift_missed, staff3_id, client_active_1, 'Missed shift — no contact',
     'Staff member did not attend scheduled shift and could not be reached by phone for 2 hours.',
     'emergency', 'investigating', (CURRENT_DATE - 3) + TIME '08:30');

  -- ============================================================
  -- NOTIFICATIONS
  -- ============================================================

  -- Admin notifications
  INSERT INTO public.notifications (user_id, type, title, message, related_id, read, created_at)
  VALUES
    (admin_id, 'clock_in', 'Staff Clocked In', 'James Okonkwo clocked in for Afternoon community walk with Ahmed Hassan.', shift_active_1, true, now() - INTERVAL '43 minutes'),
    (admin_id, 'incident', 'New Incident Reported', 'High severity incident: Near-fall during transfer (Margaret Thompson).', shift_completed_1, false, (CURRENT_DATE - 1) + TIME '18:31'),
    (admin_id, 'compliance', 'Document Expiring', 'Priya Sharma: Police Clearance expires in 30 days.', staff2_id, false, CURRENT_DATE - INTERVAL '1 day'),
    (admin_id, 'compliance', 'Document Expired', 'Tom Nguyen: Police Clearance has expired. Staff member is blocked from roster.', staff3_id, false, CURRENT_DATE - INTERVAL '2 days'),
    (admin_id, 'missed_clock_in', 'Missed Clock-In', 'Tom Nguyen did not clock in for Morning check-in (Margaret Thompson).', shift_missed, true, (CURRENT_DATE - 3) + TIME '08:20');

  -- Staff notifications
  INSERT INTO public.notifications (user_id, type, title, message, related_id, read, created_at)
  VALUES
    (staff1_id, 'shift_assigned', 'New Shift Assigned', 'You have been assigned Morning personal care with Margaret Thompson tomorrow.', shift_scheduled_1, false, CURRENT_DATE - INTERVAL '2 hours'),
    (staff2_id, 'compliance', 'Document Expiring Soon', 'Your Police Clearance expires in 30 days. Please upload a renewed copy.', staff2_id, false, CURRENT_DATE - INTERVAL '1 day'),
    (staff3_id, 'compliance', 'Document Expired', 'Your Police Clearance has expired. You cannot be rostered until renewed.', staff3_id, true, CURRENT_DATE - INTERVAL '2 days'),
    (staff3_id, 'compliance', 'Document Expired', 'Your Working With Children Check has expired. Upload renewed document immediately.', staff3_id, false, CURRENT_DATE - INTERVAL '1 day');

  -- ============================================================
  -- AGREEMENTS
  -- ============================================================

  INSERT INTO public.agreements (template_id, target_type, target_id, title, status, expires_on, signed_at, signer_name, supports_description, funding_type, payment_method, created_by)
  VALUES
    -- Signed client agreement
    (
      (SELECT id FROM public.agreement_templates WHERE name = 'Client Service Agreement' LIMIT 1),
      'client', client_active_1, 'Service Agreement — Margaret Thompson',
      'signed', CURRENT_DATE + INTERVAL '12 months',
      CURRENT_DATE - INTERVAL '60 days', 'Margaret Thompson',
      'Personal care, mobility assistance, evening routine support.',
      'ndia', 'eft', admin_id
    ),
    -- Pending signature
    (
      (SELECT id FROM public.agreement_templates WHERE name = 'Client Service Agreement' LIMIT 1),
      'client', client_active_2, 'Service Agreement — Ahmed Hassan',
      'pending_signature', CURRENT_DATE + INTERVAL '14 days',
      NULL, NULL,
      'Community access, social participation, transport assistance.',
      'plan_manager', 'eft', admin_id
    ),
    -- Expired agreement
    (
      (SELECT id FROM public.agreement_templates WHERE name = 'Client Service Agreement' LIMIT 1),
      'client', client_inactive, 'Service Agreement — Robert Williams',
      'expired', CURRENT_DATE - INTERVAL '30 days',
      CURRENT_DATE - INTERVAL '395 days', 'Robert Williams',
      'General daily support — ceased.',
      'self', 'eft', admin_id
    ),
    -- Staff agreement (signed)
    (
      (SELECT id FROM public.agreement_templates WHERE name = 'Staff Employment Pack' LIMIT 1),
      'staff', staff1_id, 'Employment Pack — James Okonkwo',
      'signed', NULL,
      CURRENT_DATE - INTERVAL '90 days', 'James Okonkwo',
      NULL, NULL, NULL, admin_id
    );

  -- ============================================================
  -- SHIFT DOCUMENTATION (for completed shifts)
  -- ============================================================

  INSERT INTO public.shift_documentation (shift_id, support_type_key, form_key, title, payload, status, submitted_by, submitted_at)
  VALUES
    (shift_completed_1, 'personal_care', 'support_log', 'Support log',
     '{"support_summary": "Assisted Margaret with evening shower, dressing, and transfer to bed. Used hoist for bed transfer.", "goals_progress": "Margaret completed most tasks independently with standby assist only. Good progress on upper body strength."}'::jsonb,
     'approved', staff1_id, (CURRENT_DATE - 1) + TIME '19:10'),
    (shift_completed_1, 'personal_care', 'roster_confirmation', 'Roster confirmation',
     '{"arrival_confirmed": true, "departure_confirmed": true, "client_signature_note": "Margaret confirmed verbally."}'::jsonb,
     'submitted', staff1_id, (CURRENT_DATE - 1) + TIME '19:12'),
    (shift_completed_2, 'medication_support', 'support_log', 'Support log',
     '{"support_summary": "Administered morning medications per chart. Lucy took all tablets with water.", "goals_progress": "Lucy self-managed her pill organiser setup for the afternoon dose."}'::jsonb,
     'submitted', staff2_id, (CURRENT_DATE - 2) + TIME '09:05'),
    (shift_completed_2, 'medication_support', 'medication_admin', 'Medication administration',
     '{"medication_name": "Sertraline 50mg", "dose": "1 tablet", "administered_at": "2025-05-03T08:15:00"}'::jsonb,
     'submitted', staff2_id, (CURRENT_DATE - 2) + TIME '09:06');

  -- ============================================================
  -- ORGANIZATION SETTINGS (update defaults with realistic data)
  -- ============================================================

  UPDATE public.organization_settings SET
    org_name = 'Vivid Care',
    business_email = 'operations@vividcare.com.au',
    business_phone = '08 6100 4500',
    address = '210 St Georges Terrace, Perth WA 6000',
    timezone = 'Australia/Perth',
    geofence_radius_meters = 300,
    clock_in_window_minutes = 15,
    doc_warning_days = ARRAY[45, 30, 14, 7],
    pay_period = 'fortnightly',
    compliance_email = 'compliance@vividcare.com.au',
    ndis_provider_number = '4050001234',
    abn = '12 345 678 901',
    contact_name = 'Sarah Mitchell',
    website = 'https://vividcare.com.au'
  WHERE id = 1;

  RAISE NOTICE 'Seed data inserted successfully.';
  RAISE NOTICE 'Admin: admin@vividcare.test';
  RAISE NOTICE 'Staff (roster-ready): staff1@vividcare.test (James Okonkwo)';
  RAISE NOTICE 'Staff (expiring docs): staff2@vividcare.test (Priya Sharma)';
  RAISE NOTICE 'Staff (blocked/expired): staff3@vividcare.test (Tom Nguyen)';
  RAISE NOTICE 'Staff (mixed): staff4@vividcare.test (Elena Vasquez)';

END $$;

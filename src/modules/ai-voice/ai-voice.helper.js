const formatChronicDiseases = (diseases) => {
    if (!diseases || diseases.length === 0) return 'None reported';
    return diseases.map(d => {
        let str = d.nameOfDisease;
        if (d.type) str += ` (${d.type})`;
        if (d.since) str += ` - since ${d.since}`;
        return str;
    }).join(', ');
};
const formatAllergies = (allergies) => {
    if (!allergies || allergies.length === 0) return 'None reported';
    return allergies.map(a => {
        let str = a.nameOfAllergy;
        if (a.types && a.types.length > 0) {
            const reactions = a.types.map(t => {
                let reaction = t.reaction || 'unknown reaction';
                if (t.severity) reaction += ` (${t.severity})`;
                return reaction;
            }).join(', ');
            str += `: ${reactions}`;
        }
        return str;
    }).join('; ');
};
const formatMedications = (medications) => {
    if (!medications || medications.length === 0) return 'None';
    return medications.map(m => {
        let str = m.name || 'Unknown medication';
        if (m.dosage) str += ` (${m.dosage})`;
        if (m.reason) str += ` - for ${m.reason}`;
        return str;
    }).join(', ');
};
const formatPreviousSurgeries = (surgeries) => {
    if (!surgeries || surgeries.length === 0) return 'None reported';
    return surgeries.map(s => {
        let str = s.nameOfSurgery || 'Unknown surgery';
        if (s.date) str += ` (${s.date.toISOString().split('T')[0]})`;
        if (s.hospital) str += ` at ${s.hospital}`;
        if (s.doctor) str += ` by Dr. ${s.doctor}`;
        if (s.notes) str += ` - Notes: ${s.notes}`;
        return str;
    }).join(', ');
};
const formatFamilyMedicalHistory = (history) => {
    if (!history || history.length === 0) return 'None reported';
    return history.map(h => {
        let str = `${h.nameOfFamilyMember || 'Unknown family member'}: ${h.nameOfDisease || 'Unknown disease'}`;
        if (h.age) str += ` (diagnosed at age ${h.age})`;
        return str;
    }).join('; ');
};
const formatLifestyle = (lifestyle) => {
    if (!lifestyle) return 'No lifestyle information';
    const { smokingStatus, alcoholConsumption, physicalActivityLevel, sleepQuality, averageSleepHours } = lifestyle;
    return `Smoking: ${smokingStatus || 'Unknown'}, Alcohol: ${alcoholConsumption || 'Unknown'}, Physical Activity: ${physicalActivityLevel || 'Unknown'}, Sleep Quality: ${sleepQuality || 'Unknown'}, Average Sleep Hours: ${averageSleepHours || 'Unknown'}`;
}

const buildLlamaPrompt = (patientInfo, previousVisits, transcript) => {
    return `You are an expert clinical documentation AI assisting a doctor during a medical visit.
You will receive a real doctor-patient conversation in Arabic (Egyptian dialect).
Your job is to analyze the conversation and produce a structured medical report.

=== PATIENT PROFILE ===
- Age: ${patientInfo.age} | Gender: ${patientInfo.gender} | Blood Type: ${patientInfo.bloodType || 'Unknown'}
- Marital Status: ${patientInfo.maritalStatus} | BMI: ${patientInfo.bmi || 'Unknown'}
- Chronic Diseases: ${formatChronicDiseases(patientInfo.chronicDiseases)}
- Current Medications: ${formatMedications(patientInfo.currentMedications)}
- Known Allergies: ${formatAllergies(patientInfo.allergies)}
- Previous Surgeries: ${formatPreviousSurgeries(patientInfo.previousSurgeries)}
- Family Medical History: ${formatFamilyMedicalHistory(patientInfo.familyMedicalHistory)}
- Lifestyle: ${formatLifestyle(patientInfo.lifestyle)}

=== PREVIOUS VISITS ===
${previousVisits || 'No previous visit records available.'}

=== CURRENT VISIT TRANSCRIPT ===
${transcript}

=== INSTRUCTIONS ===
1. Translate the Arabic conversation to English internally. Do NOT include the translation in the output.
2. Think step-by-step internally before generating the final JSON. Do NOT include your reasoning.
3. Extract ALL symptoms the patient mentioned — even if briefly or casually stated.
4. Cross-reference symptoms with chronic diseases, current medications, and family history.
5. Identify ONLY medications explicitly named by the doctor in this conversation.
   Do NOT suggest, infer, or add medications not clearly stated by the doctor.
   If the doctor uses a brand name, use it as-is.
6. Carefully check ALL current medications against any new prescriptions for interactions.
   Flag ANY potential risk — even theoretical or uncertain ones.
7. Check new prescriptions against known allergies.
8. Return ONLY a valid JSON object.
   Do NOT include any explanation, text, markdown, or backticks.

=== EXPECTED OUTPUT ===
{
  "symptoms": [],
  "diagnosis": "",
  "prescription": {
    "medications": [
      {
        "name": "",
        "dose": "",
        "frequency": "",
        "duration": "",
        "notes": ""
      }
    ],
    "lifestyle_advice": ""
  },
  "summary": "",
  "follow_up": "",
  "urgency_level": "routine | urgent | emergency",
  "alerts": {
    "drug_interactions": [],
    "allergy_conflicts": [],
    "requires_immediate_attention": false
  },
  "ai_suggestions": []
}

=== RULES ===
[symptoms]
- Include ALL symptoms mentioned by the patient, even minor or passing ones
- Use clear medical English terms (e.g. "persistent headache", "photosensitivity")

[diagnosis]
- Preliminary diagnosis based on: conversation + patient history + chronic diseases
- If uncertain, state it as "possible" or "probable"
- Consider chronic diseases as contributing factors

[prescription.medications]
- ONLY include medications explicitly named by the doctor in THIS conversation
- DO NOT include patient's existing medications
- DO NOT suggest or infer medications not mentioned
- If dose or duration not mentioned → set as "not specified"
- notes: any special instructions mentioned (e.g. "take after meals", "avoid sunlight")

[prescription.lifestyle_advice]
- Extract any lifestyle advice the doctor mentioned
- Empty string if none mentioned

[summary]
- 3-4 sentences maximum
- Cover: main complaint, key findings, diagnosis, and action taken
- Written as a clinical note, not a conversation recap

[follow_up]
- Specific follow-up actions or appointments mentioned by the doctor
- If none mentioned → "No follow-up specified"

[urgency_level]
- routine: standard visit, no immediate risk
- urgent: needs attention within 24-48 hours
- emergency: requires immediate medical attention
- Base this on: symptoms severity, alerts found, requires_immediate_attention

[alerts]
- drug_interactions: check ALL current medications against new prescriptions
  Flag even potential or theoretical interactions
  Format: "Drug A + Drug B: [effect]"
- allergy_conflicts: check new prescriptions against known allergies
  Format: "Drug X: patient is allergic to [substance]"
- requires_immediate_attention: true if any critical finding exists

[ai_suggestions]
- Provide exactly 3-4 suggestions for the doctor
- Each suggestion must be:
  - Actionable and specific (not generic advice)
  - Based on THIS patient's profile and THIS visit
  - Clinically relevant
- Categories to consider:
  - Diagnostic: additional tests or investigations worth ordering
  - Monitoring: parameters to track given current medications or conditions
  - Lifestyle: specific changes relevant to this patient's chronic conditions
  - Drug safety: any medication adjustments worth considering
- Format each as a single clear sentence
- Do NOT repeat information already in diagnosis or prescription`;
};

const parseJsonResponse = (response) => {
    let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('LLM response does not contain a valid JSON object');
    }
    
    let parsed;
    try {
        parsed = JSON.parse(jsonMatch[0]);
    } catch (error) {
        throw new Error(`Failed to parse JSON: ${error.message}`);
    }
    
    const requiredFields = {
        symptoms: [],
        diagnosis: '',
        summary: '',
        follow_up: '',
        prescription: { medications: [], lifestyle_advice: '' },
        alerts: { drug_interactions: [], allergy_conflicts: [], requires_immediate_attention: false },
        urgency_level: 'routine'
    };
    
    for (const [field, defaultValue] of Object.entries(requiredFields)) {
        if (!(field in parsed)) {
            parsed[field] = defaultValue;
        }
    }

    parsed.prescription = parsed.prescription || {};
    parsed.prescription.medications = parsed.prescription.medications || [];
    parsed.prescription.lifestyle_advice = parsed.prescription.lifestyle_advice || '';

    parsed.alerts = parsed.alerts || {};
    parsed.alerts.drug_interactions = parsed.alerts.drug_interactions || [];
    parsed.alerts.allergy_conflicts = parsed.alerts.allergy_conflicts || [];
    parsed.alerts.requires_immediate_attention = parsed.alerts.requires_immediate_attention || false;
    
    if (!Array.isArray(parsed.symptoms)) {
        parsed.symptoms = parsed.symptoms ? [String(parsed.symptoms)] : [];
    }
    
    const validUrgency = ['routine', 'urgent', 'emergency'];
    if (!validUrgency.includes(parsed.urgency_level)) {
        parsed.urgency_level = 'routine';
    }
    
    return parsed;
};

const formatPatientForPrompt = (patient) => {
    let age = 'Unknown';
    if (patient.dateOfBirth) {
        const birthDate = new Date(patient.dateOfBirth);
        const today = new Date();
        age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    }

    let bmi = 'Unknown';
    if (patient.height && patient.weight) {
        const heightInMeters = patient.height / 100;
        bmi = (patient.weight / (heightInMeters * heightInMeters)).toFixed(1);
    }

    return {
        age,
        bmi,
        gender: patient.gender || 'Unknown',
        maritalStatus: patient.maritalStatus || 'Unknown',
        bloodType: patient.bloodType || null,
        chronicDiseases: patient.medicalProfile?.chronicDiseases || [],
        allergies: patient.medicalProfile?.allergies || [],
        previousSurgeries: patient.medicalProfile?.previousSurgeries || [],
        familyMedicalHistory: patient.medicalProfile?.familyMedicalHistory || [],
        currentMedications: patient.medicalProfile?.currentMedications || [],
        lifestyle: {
            smokingStatus: patient.medicalProfile?.lifestyle?.smokingStatus || 'Unknown',
            alcoholConsumption: patient.medicalProfile?.lifestyle?.alcoholConsumption || 'Unknown',
            physicalActivityLevel: patient.medicalProfile?.lifestyle?.physicalActivityLevel || 'Unknown',
            sleepQuality: patient.medicalProfile?.lifestyle?.sleepQuality || 'Unknown',
            averageSleepHours: patient.medicalProfile?.lifestyle?.averageSleepHours || 'Unknown'
        }
    };
};

module.exports = {
    formatChronicDiseases,
    formatAllergies,
    formatMedications,
    buildLlamaPrompt,
    parseJsonResponse,
    formatPatientForPrompt
};
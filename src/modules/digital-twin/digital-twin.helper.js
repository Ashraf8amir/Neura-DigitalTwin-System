const AppError = require('../../core/appError');
const logger = require('../../core/logger');
const { HTTP_STATUS_TEXT } = require('../../shared/constants/enums');
const { digitalTwinConstants } = require('./digitalTwin.constant');

const formatList = (items) => {
    if (!Array.isArray(items) || items.length === 0) return 'None';
    return items.join(', ');
};

const buildInitialDigitalTwinPrompt = (profile) => {
    return `You are a medical AI assistant creating an initial Digital Twin for a patient.
Analyze the patient profile and generate a baseline health assessment.
=== PATIENT PROFILE ===

Basic Info:
Age: ${profile.age} | Gender: ${profile.gender} | Blood Type: ${profile.bloodType}
Weight: ${profile.weight}kg | Height: ${profile.height}cm | BMI: ${profile.bmi?.toFixed(1) || 'unknown'}

Medical History:
Chronic Diseases: ${formatList(profile.chronicDiseases)}
Current Medications: ${formatList(profile.currentMedications)}
Known Allergies: ${formatList(profile.allergies)}
Previous Surgeries: ${formatList(profile.previousSurgeries)}
Family Medical History: ${formatList(profile.familyMedicalHistory)}

Lifestyle:
Smoking: ${profile.smoking}
Alcohol Consumption: ${profile.alcohol}
Exercise: ${profile.exercise}
Diet: ${profile.diet}
Sleep: ${profile.sleepHours} hours/night
Stress Level: ${profile.stressLevel}

=== INSTRUCTIONS ===

Analyze the patient profile holistically
Identify organs already at risk from chronic diseases or lifestyle or Previous Surgeries
Calculate baseline risk scores for cardiovascular, diabetes, and stroke
Generate initial recommendations based on lifestyle and medical history
Create alerts only if chronic diseases or medications pose immediate risks
Return ONLY a valid JSON object — no markdown, no explanation, no extra text

=== EXPECTED OUTPUT ===
{
"currentState": {
"overallHealthScore": {
"score": 0,
"category": "poor | fair | good | very_good | excellent"
},
"affectedOrgans": [
{
"organ": "heart | lung | kidneys | liver | brain | pancreas | stomach | intestinesLarge | intestinesSmall | bladder",
"impact_type": "primary | secondary",
"risk_level": 0.0,
"damage_intensity": 0.0
}
]
},
"riskScores": {
"cardiovascularRisk": {
"score": 0,
"level": "low | moderate | high | very_high",
"factors": [{ "factor": "", "impact": "low | moderate | high" }]
},
"diabetesRisk": {
"score": 0,
"level": "low | moderate | high | very_high",
"factors": [{ "factor": "", "impact": "low | moderate | high" }]
},
"strokeRisk": {
"score": 0,
"level": "low | moderate | high | very_high"
}
},
"riskPredictions": [
{ "condition": "", "probability": 0.0, "timeframe": "" }
],
"recommendations": [
{
"category": "",
"priority": "low | medium | high | urgent",
"recommendation": "",
"reason": "",
"expectedImpact": ""
}
],
"alerts": [
{
"alertType": "critical | warning | info",
"category": "",
"message": "",
"severity": "low | medium | high | critical"
}
]
}
=== RULES ===
[Health Score]

Start from 100 and subtract based on risk factors:
chronic disease present     → -10 to -15 per disease
current medications         → -3 to -5 per medication
smoking                     → -10
sedentary lifestyle         → -8
high stress                 → -5
family history of disease   → -5
Categories: 0-20 poor, 21-40 fair, 41-60 good, 61-80 very_good, 81-100 excellent

[Affected Organs — Chronic Disease Mapping]

Diabetes          → kidneys (primary), heart (secondary), brain (secondary)
Hypertension      → brain (primary), heart (secondary), kidneys (secondary)
Heart disease     → heart (primary), lungs (secondary)
Liver disease     → liver (primary), stomach (secondary)
COPD/respiratory  → lungs (primary), heart (secondary)
Obesity           → heart (primary), liver (secondary), kidneys (secondary)
Kidney disease    → kidneys (primary), heart (secondary)
Use ONLY: heart, lung, kidneys, liver, brain, pancreas, stomach, intestinesLarge, intestinesSmall, bladder
If no chronic diseases → return empty affectedOrgans array

[Risk Scores]

All scores 0 to 100
Base cardiovascularRisk on: smoking, obesity, hypertension, diabetes, family history
Base diabetesRisk on: obesity, sedentary lifestyle, family history
Base strokeRisk on: hypertension, cardiovascular risk, age over 50
Always include contributing factors

[Recommendations]

Minimum 2 recommendations always
Base on lifestyle gaps and chronic diseases
urgent priority only if chronic disease is poorly managed

[Alerts]

Only if: chronic disease with known drug interaction, or critical allergy risk
Empty array if patient profile is clean`;
};

const buildDigitalTwinUpdatePrompt = (aiSummary, currentTwin) => {
    const healthScore = currentTwin?.currentState?.overallHealthScore?.score ?? 'unknown';
    const healthCategory = currentTwin?.currentState?.overallHealthScore?.category ?? 'unknown';
    const affectedOrgans = JSON.stringify(currentTwin?.currentState?.affectedOrgans || []);
    const cardiovascularRisk = currentTwin?.riskScores?.cardiovascularRisk?.level ?? 'unknown';
    const diabetesRisk = currentTwin?.riskScores?.diabetesRisk?.level ?? 'unknown';
    const strokeRisk = currentTwin?.riskScores?.strokeRisk?.level ?? 'unknown';
    const activeAlerts = JSON.stringify(currentTwin?.alerts || []);

    return `You are a medical AI assistant updating a patient's Digital Twin
after a new medical visit.
=== LATEST VISIT SUMMARY ===
${JSON.stringify(aiSummary || {}, null, 2)}
=== CURRENT DIGITAL TWIN STATE ===

Health Score: ${healthScore} (${healthCategory})
Affected Organs: ${affectedOrgans}
Cardiovascular Risk: ${cardiovascularRisk}
Diabetes Risk: ${diabetesRisk}
Stroke Risk: ${strokeRisk}
Active Alerts: ${activeAlerts}

=== INSTRUCTIONS ===

Compare visit summary with current Digital Twin state
Update only what has changed or worsened
If new diagnosis found → map to organs and increase risk scores
If drug interactions exist in alerts → create critical alert
Recalculate health score based on visit urgency and findings
Return ONLY a valid JSON object — no markdown, no explanation

=== EXPECTED OUTPUT ===
(same structure as initial DT output above)

this:
{
"currentState": {
"overallHealthScore": {
"score": 0,
"category": "poor | fair | good | very_good | excellent"
},
"affectedOrgans": [
{
"organ": "heart | lung | kidneys | liver | brain | pancreas | stomach | intestinesLarge | intestinesSmall | bladder",
"impact_type": "primary | secondary",
"risk_level": 0.0,
"damage_intensity": 0.0
}
]
},
"riskScores": {
"cardiovascularRisk": {
"score": 0,
"level": "low | moderate | high | very_high",
"factors": [{ "factor": "", "impact": "low | moderate | high" }]
},
"diabetesRisk": {
"score": 0,
"level": "low | moderate | high | very_high",
"factors": [{ "factor": "", "impact": "low | moderate | high" }]
},
"strokeRisk": {
"score": 0,
"level": "low | moderate | high | very_high"
}
},
"riskPredictions": [
{ "condition": "", "probability": 0.0, "timeframe": "" }
],
"recommendations": [
{
"category": "",
"priority": "low | medium | high | urgent",
"recommendation": "",
"reason": "",
"expectedImpact": ""
}
],
"alerts": [
{
"alertType": "critical | warning | info",
"category": "",
"message": "",
"severity": "low | medium | high | critical"
}
]
}
=== RULES ===
[Health Score Changes]

urgent visit      → subtract 10 to 20 from current score
emergency visit   → subtract 20 to 35 from current score
new chronic       → subtract 10 to 15
drug interaction  → subtract 5 to 10
routine + no new findings → change less than 5 points

[Affected Organs]

Same chronic disease mapping as initial prompt
If organ already exists → increase risk_level and damage_intensity proportionally
If new organ → add with values based on diagnosis severity

[Alerts]

drug_interactions found    → alertType: critical, severity: high
allergy_conflicts found    → alertType: critical, severity: critical
requires_immediate_attention → alertType: critical, severity: critical
Do NOT duplicate existing alerts

[General]

Be conservative — one visit should not drop score drastically
Only return fields that need updating`;
};

const buildWhatIfSimulationPrompt = (patientProfile, twin, scenario) => {
    const score = twin?.currentState?.overallHealthScore?.score ?? 0;
    const vitalSigns = twin?.currentState?.vitalSigns || {};
    const category = twin?.currentState?.overallHealthScore?.category ?? digitalTwinConstants.categoryHealthScore.FAIR;
    const affectedOrgans = JSON.stringify(twin?.currentState?.affectedOrgans || []);
    const cardiovascularRisk = twin?.riskScores?.cardiovascularRisk || {};
    const diabetesRisk = twin?.riskScores?.diabetesRisk || {};
    const strokeRisk = twin?.riskScores?.strokeRisk || {};

    return `You are a specialized medical AI assistant performing a what-if health simulation.
A patient has described a lifestyle or medical scenario.
Your job is to simulate what would happen to their health if this scenario occurred.
This is a projection only — nothing will be saved.
=== CURRENT PATIENT STATUS ===

Age: ${patientProfile.age} | Gender: ${patientProfile.gender} | Blood Type: ${patientProfile.bloodType} 

medical history:

Chronic Diseases: ${patientProfile.chronicDiseases}
Current Medications: ${patientProfile.currentMedications}
Known Allergies: ${patientProfile.allergies}
Previous Surgeries: ${patientProfile.previousSurgeries}
Family Medical History: ${patientProfile.familyMedicalHistory}

Lifestyle:

Smoking: ${patientProfile.smoking}
Exercise: ${patientProfile.exercise}
Sleep: ${patientProfile.sleepHours} hours/night
Stress Level: ${patientProfile.stressLevel}



=== CURRENT DIGITAL TWIN STATE ===

Health Score: ${score} (${category})
vitals: ${vitalSigns ? JSON.stringify(vitalSigns) : 'No data'}
Affected Organs: ${affectedOrgans}
Cardiovascular Risk: ${cardiovascularRisk.level || 'low'} (score: ${cardiovascularRisk.score ?? 0})
Diabetes Risk: ${diabetesRisk.level || 'low'} (score: ${diabetesRisk.score ?? 0})
Stroke Risk: ${strokeRisk.level || 'low'} (score: ${strokeRisk.score ?? 0})

=== PATIENT SCENARIO ===
"${scenario}"
=== INSTRUCTIONS ===

Understand the scenario — it may be in Arabic or English
Cross-reference with chronic diseases and current medications
Identify all organs that would be affected (primary = direct, secondary = cascading)
Project the new health score IF this scenario happens
Detect drug interactions only if scenario involves medication changes
Assess confidence based on scenario clarity
Return ONLY a valid JSON object — no markdown, no explanation, no extra text

=== EXPECTED OUTPUT ===
{
"scenario_understood": "",
"overall_impact": "positive | negative | neutral",
"confidence_level": 0.0,
"severity": "mild | moderate | severe",
"timeline": "",
"projected_health_score": {
"score": 0,
"category": "poor | fair | good | very_good | excellent",
"change": 0
},
"bmi": 0.0,
"bmi_category": "underweight | normal | overweight | obese",
"affected_organs": [
{
"organ": "heart | lungs | kidneys | liver | brain | pancreas | stomach | intestines",
"impact_type": "primary | secondary",
"risk_level": 0.0,
"damage_intensity": 0.0,
"primary_symptom": "",
"explanation": ""
}
],
"drug_drug_interactions": [
{
"drug_a": "",
"drug_b": "",
"severity": "mild | moderate | severe",
"effect": ""
}
],
"warnings": [],
"recommendations_summary": [],
"narrative_summary": "A 3-4 sentence clinical summary explaining the simulation results in simple English for the patient."
}
=== RULES ===
[scenario_understood]

Restate the scenario in one clear English sentence
If scenario is in Arabic, translate and restate it

[projected_health_score]

Start from current Digital Twin health score
change = projected score minus current score (can be negative or positive)
positive scenario (exercise, diet, sleep improvement) → +5 to +15
negative scenario:
weight gain 5-10kg    → -5 to -10
weight gain 10kg+     → -10 to -20
stopping medication   → -10 to -25 (depends on importance)
starting smoking      → -10 to -15
sleep deprivation     → -5 to -10
high stress           → -5 to -8
Never go below 0 or above 100
Categories: 0-20 poor, 21-40 fair, 41-60 good, 61-80 very_good, 81-100 excellent

[bmi_calculation_logic]
- ALWAYS calculate a projected BMI. Never return 0.
- Use current height/weight from profile. If missing, assume (175cm / 70kg).
- Scenario Interpretation:
  1. EXPLICIT: Use the exact weight/height mentioned.
  2. INFERRED: If the scenario is "eating sweets" or "running", assume this happens over 2 months.
- Estimated Shifts for Inferred Scenarios:
  - Unhealthy habits (sweets, junk food, sedentary): +2kg to +5kg.
  - Healthy habits (running, clean diet, gym): -2kg to -5kg.
- Logic: Current Weight -> Apply Shift -> Calculate New BMI -> Determine Category.
- Categories: Underweight (<18.5), Normal (18.5-24.9), Overweight (25-29.9), Obese (30+).
 

[affected_organs]

These are PROJECTED organs — what would be affected if scenario happens
Do NOT copy current affectedOrgans blindly — only include what this scenario impacts
Always apply chronic disease mapping for at-risk patients:
Diabetes          → kidneys (primary), heart (secondary), brain (secondary)
Hypertension      → brain (primary), heart (secondary), kidneys (secondary)
Heart disease     → heart (primary), lungs (secondary)
Liver disease     → liver (primary), stomach (secondary)
COPD/respiratory  → lungs (primary), heart (secondary)
Obesity           → heart (primary), liver (secondary), kidneys (secondary)
Kidney disease    → kidneys (primary), heart (secondary)
Use ONLY: heart, lungs, kidneys, liver, brain, pancreas, stomach, intestines
Always list primary before secondary
risk_level and damage_intensity: float 0.0 to 1.0
Increase values if patient already has chronic disease in that organ

[damage_intensity & risk_level scale]

0.0 to 0.3 → negligible
0.3 to 0.6 → moderate — monitor
0.6 to 0.8 → high — intervention recommended
0.8 to 1.0 → critical — immediate action

[confidence_level]

0.8 to 1.0 → clear specific scenario
0.5 to 0.7 → vague or general lifestyle scenario
below 0.5  → very unclear → explain in warnings

[drug_drug_interactions]

ONLY if scenario involves stopping, adding, or changing medications
Check against ALL current medications in patient profile
Empty array [] if no medication change involved

[warnings]

Include if: confidence below 0.6, data missing, immediate risk detected
Always add "Consult your doctor before making any medication changes"
if scenario involves stopping or changing medications
Always add "Consult your doctor" if severity is severe

[recommendations_summary]

2 to 3 short actionable recommendations based on simulation outcome
What should the patient do given this scenario result

[narrative_summary]
- Provide a clear, concise summary (3 to 4 sentences).
- Start with the general health impact (e.g., 'This scenario would likely lead to a decline in your cardiovascular health...').
- Explain the logic behind the primary organ impact based on the patient's chronic conditions.
- End with a brief, supportive closing statement.

[timeline]
- Only include if scenario has a clear timeframe (e.g., "after 6 months of this habit")
- Otherwise, leave empty string.


[General]

Be conservative — flag risks rather than ignore them
This is a SIMULATION — use conditional language in explanations
("would affect", "could increase", "may lead to")
Do NOT invent data not present in patient profile
drug_drug_interactions must be empty array if no medication involved`;
};

const parseJsonResponse = (response) => {
    const cleaned = String(response || '')
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('LLM response does not contain a valid JSON object');
    }

    try {
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        throw new Error(`Failed to parse JSON: ${error.message}`);
    }
};

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

const validateDTUpdateJSON = (payload, options = {}) => {
    const { requireFull = false } = options;
    const isInRange = (value, min, max) => typeof value === 'number' && value >= min && value <= max;

    try {
        if (!isPlainObject(payload)) {
            throw new Error('Payload must be an object');
        }

        if (requireFull) {
            const requiredSections = ['currentState', 'riskScores', 'riskPredictions', 'recommendations', 'alerts', 'bmi'];
            for (const section of requiredSections) {
                if (payload[section] === undefined) {
                    throw new Error(`Missing required section: ${section}`);
                }
            }
        }

        if (payload.bmi !== undefined && typeof payload.bmi !== 'number') {
            throw new Error('bmi must be a number');
        }

        if (payload.currentState !== undefined) {
            if (!isPlainObject(payload.currentState)) {
                throw new Error('currentState must be an object');
            }

            if (payload.currentState.overallHealthScore !== undefined) {
                const score = payload.currentState.overallHealthScore;
                if (!isPlainObject(score)) {
                    throw new Error('overallHealthScore must be an object');
                }
                if (score.score !== undefined && !isInRange(score.score, 0, 100)) {
                    throw new Error('overallHealthScore.score must be between 0 and 100');
                }
                if (score.category !== undefined && !Object.values(digitalTwinConstants.categoryHealthScore).includes(score.category)) {
                    throw new Error('overallHealthScore.category is invalid');
                }
            }

            if (payload.currentState.affectedOrgans !== undefined) {
                if (!Array.isArray(payload.currentState.affectedOrgans)) {
                    throw new Error('affectedOrgans must be an array');
                }

                payload.currentState.affectedOrgans.forEach((organEntry, index) => {
                    if (!isPlainObject(organEntry)) {
                        throw new Error(`affectedOrgans[${index}] must be an object`);
                    }

                    if (organEntry.organ !== undefined && !Object.values(digitalTwinConstants.organTypes).includes(organEntry.organ)) {
                        throw new Error(`affectedOrgans[${index}].organ is invalid`);
                    }
                    if (organEntry.impact_type !== undefined && !Object.values(digitalTwinConstants.organImpactTypes).includes(organEntry.impact_type)) {
                        throw new Error(`affectedOrgans[${index}].impact_type is invalid`);
                    }
                    if (organEntry.risk_level !== undefined && !isInRange(organEntry.risk_level, 0, 1)) {
                        throw new Error(`affectedOrgans[${index}].risk_level must be between 0 and 1`);
                    }
                    if (organEntry.damage_intensity !== undefined && !isInRange(organEntry.damage_intensity, 0, 1)) {
                        throw new Error(`affectedOrgans[${index}].damage_intensity must be between 0 and 1`);
                    }
                });
            }
        }

        if (payload.riskScores !== undefined) {
            if (!isPlainObject(payload.riskScores)) {
                throw new Error('riskScores must be an object');
            }

            ['cardiovascularRisk', 'diabetesRisk', 'strokeRisk'].forEach((riskType) => {
                if (payload.riskScores[riskType] === undefined) return;

                const risk = payload.riskScores[riskType];
                if (!isPlainObject(risk)) {
                    throw new Error(`riskScores.${riskType} must be an object`);
                }

                if (risk.score !== undefined && !isInRange(risk.score, 0, 100)) {
                    throw new Error(`riskScores.${riskType}.score must be between 0 and 100`);
                }
                if (risk.level !== undefined && !Object.values(digitalTwinConstants.riskScore).includes(risk.level)) {
                    throw new Error(`riskScores.${riskType}.level is invalid`);
                }

                if (risk.factors !== undefined) {
                    if (!Array.isArray(risk.factors)) {
                        throw new Error(`riskScores.${riskType}.factors must be an array`);
                    }
                    risk.factors.forEach((factor, index) => {
                        if (!isPlainObject(factor)) {
                            throw new Error(`riskScores.${riskType}.factors[${index}] must be an object`);
                        }
                        if (factor.impact !== undefined && !Object.values(digitalTwinConstants.riskFactorImpact).includes(factor.impact)) {
                            throw new Error(`riskScores.${riskType}.factors[${index}].impact is invalid`);
                        }
                    });
                }
            });
        }

        if (payload.riskPredictions !== undefined) {
            if (!Array.isArray(payload.riskPredictions)) {
                throw new Error('riskPredictions must be an array');
            }
            payload.riskPredictions.forEach((prediction, index) => {
                if (!isPlainObject(prediction)) {
                    throw new Error(`riskPredictions[${index}] must be an object`);
                }
                if (prediction.probability !== undefined && !isInRange(prediction.probability, 0, 1)) {
                    throw new Error(`riskPredictions[${index}].probability must be between 0 and 1`);
                }
            });
        }

        if (payload.recommendations !== undefined) {
            if (!Array.isArray(payload.recommendations)) {
                throw new Error('recommendations must be an array');
            }
            payload.recommendations.forEach((recommendation, index) => {
                if (!isPlainObject(recommendation)) {
                    throw new Error(`recommendations[${index}] must be an object`);
                }
                if (recommendation.priority !== undefined && !Object.values(digitalTwinConstants.recommendationPriority).includes(recommendation.priority)) {
                    throw new Error(`recommendations[${index}].priority is invalid`);
                }
            });
        }

        if (payload.alerts !== undefined) {
            if (!Array.isArray(payload.alerts)) {
                throw new Error('alerts must be an array');
            }
            payload.alerts.forEach((alert, index) => {
                if (!isPlainObject(alert)) {
                    throw new Error(`alerts[${index}] must be an object`);
                }
                if (alert.alertType !== undefined && !Object.values(digitalTwinConstants.alertLevels).includes(alert.alertType)) {
                    throw new Error(`alerts[${index}].alertType is invalid`);
                }
                if (alert.severity !== undefined && !Object.values(digitalTwinConstants.alertSeverity).includes(alert.severity)) {
                    throw new Error(`alerts[${index}].severity is invalid`);
                }
            });
        }

        return true;
    } catch (error) {
        logger.error('Digital Twin AI response validation failed', {
            error: error.message,
            payload
        });
        throw new AppError(500, HTTP_STATUS_TEXT.ERROR, 'Invalid digital twin AI response');
    }
};

const flattenObjectForSet = (data, parentKey = '', result = {}) => {
    if (!isPlainObject(data)) {
        return result;
    }

    for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;

        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        if (isPlainObject(value)) {
            flattenObjectForSet(value, fullKey, result);
        } else {
            result[fullKey] = value;
        }
    }

    return result;
};

module.exports = {
    buildInitialDigitalTwinPrompt,
    buildDigitalTwinUpdatePrompt,
    buildWhatIfSimulationPrompt,
    parseJsonResponse,
    validateDTUpdateJSON,
    flattenObjectForSet
};

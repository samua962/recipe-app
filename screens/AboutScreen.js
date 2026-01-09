// screens/AboutScreen.js - UPDATED WITH SIMPLIFIED HEADER
import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Linking,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

const { width } = Dimensions.get("window");

// Team members data with local images
const TEAM_MEMBERS = [
  {
    id: 1,
    name: "Samuel Tesfaye",
    idNumber: "5028/14",
    role: "Team Lead & Full Stack",
    roleAm: "የቡድን መሪ እና ፈል ስታክ",
    contribution: "Project architecture & Backend",
    contributionAm: "የፕሮጀክት አርክቴክቸር እና ቤክነድ",
    color: "#4CAF50",
    image: require('../assets/samuel.png'), // Local image
  },
  {
    id: 2,
    name: "Mikiyas Hagos",
    idNumber: "5322/14",
    role: "Frontend Developer",
    roleAm: "ፍሮንትነድ አበልጻጊ",
    contribution: "UI/UX Design & Implementation",
    contributionAm: "UI/UX ዲዛይን እና አፈፃፀም",
    color: "#2196F3",
    image: require('../assets/mikias.jpg'), // Local image
  },
  {
    id: 3,
    name: "Kalu Abiyu",
    idNumber: "5009/14",
    role: "Backend Developer",
    roleAm: "ቤክነድ አበልጻጊ",
    contribution: "Database & API Development",
    contributionAm: "የውሂብ ጎታ እና API ልማት",
    color: "#FF9800",
    image: require('../assets/kalu.jpg'), // Local image
  },
  {
    id: 4,
    name: "Yabsira Hailu",
    idNumber: "0102/15",
    role: "Mobile Developer",
    roleAm: "ሞባይል አበልጻጊ",
    contribution: "Cross-platform Development",
    contributionAm: "ክሮስ-ፕላትፎርም ልማት",
    color: "#9C27B0",
    image: require('../assets/yabsira.jpg'), // Local image
  },
  {
    id: 5,
    name: "Yordanos Girma",
    idNumber: "5113/14",
    role: "QA & Documentation",
    roleAm: "ጥራት ማረጋገጫ እና ሰነዶች",
    contribution: "Testing & Technical Writing",
    contributionAm: "ሙከራ እና ቴክኒካል ጽሑፍ",
    color: "#E91E63",
    image: require('../assets/yordanos.png'), // Local image
  },
];

// University data with logo
const UNIVERSITY_INFO = {
  logo: require('../assets/universitylogo.jpg'), // Local university logo
  name: "Admas University",
  nameAm: "አድማስ ዩኒቨርሲቲ",
  department: "Computer Science Department",
  departmentAm: "የኮምፒተር ሳይንስ ክፍል",
  projectType: "Senior Project - Computer Science",
  projectTypeAm: "ሲኒየር ፕሮጀክት - ኮምፒተር ሳይንስ",
  year: "2025",
};

// Technologies used
const TECHNOLOGIES = [
  { name: "React Native", icon: "logo-react", color: "#61DAFB" },
  { name: "Firebase", icon: "flame", color: "#FFCA28" },
  { name: "Expo", icon: "logo-apple", color: "#000020" },
  { name: "JavaScript", icon: "logo-javascript", color: "#F7DF1E" },
  { name: "Firestore", icon: "server", color: "#FF6F00" },
  { name: "Authentication", icon: "lock-closed", color: "#4CAF50" },
];

export default function AboutScreen() {
  const navigation = useNavigation();
  const { t, locale } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('about.shareMessage'),
        title: t('about.appName'),
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleContact = () => {
    // You can implement email or other contact methods
    Linking.openURL('mailto:team@recipeapp.com?subject=Recipe App Inquiry');
  };

  // Header animation
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [180, 100],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Title opacity - fades out as user scrolls
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 80, 100],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Animated Header */}
      <Animated.View style={[
        styles.headerContainer,
        { 
          backgroundColor: colors.primary,
          height: headerHeight,
        }
      ]}>
        {/* Header with Back, Title, and Share */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          
          {/* "About Us" title that stays visible in header */}
          <Text style={[styles.headerTitle, { color: "#fff" }]}>
            {t('about.title')}
          </Text>
          
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Animated hero content that fades out on scroll */}
        <Animated.View style={[
          styles.heroContent,
          { opacity: titleOpacity }
        ]}>
          <View style={[styles.logoContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="restaurant" size={40} color={colors.primary} />
          </View>
          <Text style={styles.appName}>{t('about.appName')}</Text>
          <Text style={styles.tagline}>{t('about.tagline')}</Text>
        </Animated.View>
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {/* Project Description */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('about.projectTitle')}
              </Text>
            </View>
            
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t('about.description')}
            </Text>
            
            <View style={[styles.featuresContainer, { borderTopColor: colors.border }]}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="flame" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>
                  {t('about.feature1')}
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="people" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>
                  {t('about.feature2')}
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="language" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>
                  {t('about.feature3')}
                </Text>
              </View>
            </View>
          </View>

          {/* Team Members with Photos */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('about.teamTitle')}
              </Text>
            </View>
            
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {t('about.teamSubtitle')}
            </Text>
            
            <View style={styles.teamGrid}>
              {TEAM_MEMBERS.map((member) => (
                <TouchableOpacity 
                  key={member.id}
                  style={[styles.teamCard, { backgroundColor: colors.card }]}
                  activeOpacity={0.9}
                >
                  {/* Team Member Photo */}
                  <View style={styles.memberPhotoContainer}>
                    {member.image ? (
                      <Image 
                        source={member.image} 
                        style={[styles.memberPhoto, { borderColor: member.color }]}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.memberPhotoFallback, { backgroundColor: member.color + '20' }]}>
                        <Text style={[styles.memberInitial, { color: member.color }]}>
                          {member.name.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={[styles.memberName, { color: colors.text }]}>
                    {member.name}
                  </Text>
                  
                  <View style={[styles.memberIdBadge, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.memberId, { color: colors.primary }]}>
                      {member.idNumber}
                    </Text>
                  </View>
                  
                  <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                    {locale === 'am' ? member.roleAm : member.role}
                  </Text>
                  
                  <Text style={[styles.memberContribution, { color: colors.textSecondary }]}>
                    {locale === 'am' ? member.contributionAm : member.contribution}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Technologies */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="code-slash" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('about.techTitle')}
              </Text>
            </View>
            
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t('about.techDescription')}
            </Text>
            
            <View style={styles.techGrid}>
              {TECHNOLOGIES.map((tech, index) => (
                <View 
                  key={index}
                  style={[styles.techChip, { backgroundColor: colors.background }]}
                >
                  <View style={[styles.techIcon, { backgroundColor: tech.color + '20' }]}>
                    <Ionicons name={tech.icon} size={18} color={tech.color} />
                  </View>
                  <Text style={[styles.techName, { color: colors.text }]}>
                    {tech.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* University Info with Logo */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="school" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('about.universityTitle')}
              </Text>
            </View>
            
            <View style={[styles.universityCard, { backgroundColor: colors.card }]}>
              {/* University Logo */}
              <View style={styles.universityLogoContainer}>
                {UNIVERSITY_INFO.logo ? (
                  <Image 
                    source={UNIVERSITY_INFO.logo} 
                    style={styles.universityLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.universityLogoFallback, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="book" size={30} color={colors.primary} />
                  </View>
                )}
              </View>
              
              <Text style={[styles.universityName, { color: colors.text }]}>
                {locale === 'am' ? UNIVERSITY_INFO.nameAm : UNIVERSITY_INFO.name}
              </Text>
              
              <Text style={[styles.universityDept, { color: colors.textSecondary }]}>
                {locale === 'am' ? UNIVERSITY_INFO.departmentAm : UNIVERSITY_INFO.department}
              </Text>
              
              <Text style={[styles.universityProject, { color: colors.textSecondary }]}>
                {locale === 'am' ? UNIVERSITY_INFO.projectTypeAm : UNIVERSITY_INFO.projectType}
              </Text>
              
              <View style={[styles.universityYear, { backgroundColor: colors.primary + '10' }]}>
                <Text style={[styles.yearText, { color: colors.primary }]}>
                  {UNIVERSITY_INFO.year}
                </Text>
              </View>
            </View>
          </View>

          {/* Contact CTA */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="mail" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('about.contactTitle')}
              </Text>
            </View>
            
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t('about.contactDescription')}
            </Text>
            
            <View style={styles.contactButtons}>
              <TouchableOpacity 
                style={[styles.contactButton, { backgroundColor: colors.primary }]}
                onPress={handleContact}
              >
                <Ionicons name="mail-outline" size={20} color="#fff" />
                <Text style={styles.contactButtonText}>
                  {t('about.contactButton')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.secondaryButton, { borderColor: colors.primary }]}
                onPress={() => Linking.openURL('https://github.com')}
              >
                <Ionicons name="logo-github" size={20} color={colors.primary} />
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  {t('about.githubButton')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t('about.copyright')}
            </Text>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>
              {t('about.version')} 1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  shareButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  heroContent: {
    alignItems: "center",
    paddingBottom: 30,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  featuresContainer: {
    borderTopWidth: 1,
    paddingTop: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  teamGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: -4,
  },
  teamCard: {
    width: (width - 86) / 2,
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  // Team Member Photo Styles
  memberPhotoContainer: {
    marginBottom: 12,
  },
  memberPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
  },
  memberPhotoFallback: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  memberInitial: {
    fontSize: 24,
    fontWeight: "bold",
  },
  memberName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  memberIdBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  memberId: {
    fontSize: 11,
    fontWeight: "600",
  },
  memberRole: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  memberContribution: {
    fontSize: 11,
    textAlign: "center",
    fontStyle: "italic",
  },
  techGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  techChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  techIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  techName: {
    fontSize: 13,
    fontWeight: "500",
  },
  // University Logo Styles
  universityCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
  },
  universityLogoContainer: {
    marginBottom: 16,
  },
  universityLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  universityLogoFallback: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  universityName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  universityDept: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: "center",
  },
  universityProject: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: "center",
  },
  universityYear: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  yearText: {
    fontSize: 13,
    fontWeight: "600",
  },
  contactButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    marginBottom: 8,
  },
  versionText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
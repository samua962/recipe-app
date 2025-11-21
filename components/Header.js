import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function Header({ title = 'Explore', subtitle }) {
	return (
		<LinearGradient
			colors={["#f3c11cff", "#FFB199"]}
			start={[0, 0]}
			end={[1, 1]}
			style={styles.container}
		>
			<View>
				<Text style={styles.title}>{title}</Text>
				{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
			</View>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingTop: 26,
		paddingBottom: 18,
		paddingHorizontal: 16,
		borderRadius: 12,
		marginBottom: 12,
	},
	title: {
		color: '#fff',
		fontSize: 22,
		fontWeight: '700',
	},
	subtitle: {
		color: 'rgba(255,255,255,0.9)',
		marginTop: 4,
		fontSize: 13,
		fontWeight: '500',
	},
});

import {View, Text, TextInput } from "react-native";

export default function Input({label, placeholder,value,onChangeText}){
    return(
    <View>
        <Text>{label}</Text>
        <TextInput placeholder={placeholder} value={value} onChangeText={onChangeText}/>
    </View>
    )

}
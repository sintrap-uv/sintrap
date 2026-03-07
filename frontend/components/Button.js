import { View, TouchableOpacity, Text } from "react-native";


 export  default function Button({label, onPress}){
    return(
        <View>
            <TouchableOpacity onPress={onPress}>
                <Text>{label}</Text>
            </TouchableOpacity>
        </View>
    )
}

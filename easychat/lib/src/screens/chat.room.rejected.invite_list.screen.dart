import 'package:easy_locale/easy_locale.dart';
import 'package:easychat/easychat.dart';
import 'package:easyuser/easyuser.dart';
import 'package:firebase_ui_database/firebase_ui_database.dart';
import 'package:flutter/material.dart';

/// This screen list chat rooms that the login user have rejectd.
class ChatRoomRejectedInviteListScreen extends StatelessWidget {
  const ChatRoomRejectedInviteListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('rejected chat requests'.t),
      ),
      body: myUid == null
          ? Center(child: Text('sign-in first'.t))
          // : const Text('TODO: rejected list screen'),

          : FirebaseDatabaseListView(
              query: ChatService.instance.rejectedUserRef(myUid!),
              itemBuilder: (context, snapshot) {
                return ChatRoomDoc(
                  // ref: ChatService.instance.roomRef(snapshot.key!),
                  roomId: snapshot.key!,
                  builder: (room) {
                    return ChatRejectedListTile(
                      room: room,
                    );
                  },
                );
              },
            ),
    );
  }
}
